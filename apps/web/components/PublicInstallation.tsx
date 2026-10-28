"use client";
import {useEffect} from 'react';
import {registerPublicInstallation} from '../../site/src/public-installation.mjs';
export default function PublicInstallation({enabled}:{enabled:boolean}){
 useEffect(()=>{void registerPublicInstallation(enabled);},[enabled]);
 return null;
}
