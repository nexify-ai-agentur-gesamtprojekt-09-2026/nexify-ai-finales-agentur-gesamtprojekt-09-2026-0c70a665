import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import assert from 'node:assert/strict';
import Panel from './panel.mjs';
const dom=new JSDOM('<!doctype html><html><body><main></main></body></html>',{url:'https://local-test.invalid'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw Error('No network in local preparation');};window.fetch=globalThis.fetch;
let downloadBlob;URL.createObjectURL=b=>{downloadBlob=b;return 'blob:local-test'};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
const root=createRoot(document.querySelector('main'));let checks=0;
for(const locale of ['de','nl','fr','en']){
 await act(()=>root.render(React.createElement(Panel,{key:locale,locale})));
 assert.equal(document.querySelectorAll('input[type=file]').length,1);assert.equal(document.querySelectorAll('select option').length,3);assert.equal(document.querySelectorAll('button').length,0);checks++;
}
await act(()=>root.render(React.createElement(Panel,{key:'de-final',locale:'de'})));
const project=document.querySelector('input:not([type=file])');
await act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(project,'Projekt-Test');project.dispatchEvent(new dom.window.Event('input',{bubbles:true}));project.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
const picker=document.querySelector('input[type=file]');
const choose=async content=>{const b=new Blob([content],{type:'text/plain'});Object.defineProperty(b,'name',{value:'brief.txt'});Object.defineProperty(picker,'files',{configurable:true,value:[b]});await act(async()=>{picker.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,20));});};
await choose('version 1');assert.equal(document.querySelectorAll('.project-files-list>li').length,1);checks++;
await choose('version 1');assert.equal(document.querySelectorAll('.project-files-list>li').length,1);assert.match(document.body.textContent,/Identischer Inhalt/);checks++;
await choose('version 2');assert.equal(document.querySelectorAll('.project-files-list>li').length,2);assert.match(document.body.textContent,/anderer Inhalt/);assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.includes('herunterladen')).disabled,true);checks++;
const keep=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('zusätzliche Fassung'));await act(()=>keep.click());assert.ok(!document.body.textContent.includes('anderer Inhalt'));checks++;
const download=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('herunterladen'));assert.equal(download.disabled,false);await act(()=>download.click());const manifest=JSON.parse(await downloadBlob.text());assert.equal(manifest.project_label,'Projekt-Test');assert.equal(manifest.files.length,2);assert.equal(manifest.transfer,'not_started');assert.equal(manifest.content_included,false);checks++;
await act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Auswahl verwerfen').click());assert.equal(document.querySelectorAll('.project-files-list>li').length,0);checks++;
await act(()=>root.unmount());assert.equal(networkAttempts,0);console.log(JSON.stringify({checks,status:'passed',scope:'jsdom component interaction; not a real browser',fetch_attempts:networkAttempts}));
