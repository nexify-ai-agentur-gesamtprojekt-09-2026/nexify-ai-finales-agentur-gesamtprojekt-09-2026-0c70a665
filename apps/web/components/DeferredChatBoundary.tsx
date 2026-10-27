"use client";
import {Component,type ReactNode} from "react";

// A rejected lazy chunk must not remove the public shell, navigation or forms.
// Do not export error objects, messages, URLs or user inputs to telemetry here.
export default class DeferredChatBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
