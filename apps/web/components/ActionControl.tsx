"use client";
import {forwardRef,useId,type ButtonHTMLAttributes,type AnchorHTMLAttributes} from 'react';
import {SiteLink} from './Router';
import './ActionControl.css';

export type ActionVariant='primary'|'secondary'|'text'|'quiet'|'icon';
type Shared={variant?:ActionVariant;loading?:boolean;'data-testid'?:string};
type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&Shared;
const legacyClass:Record<ActionVariant,string>={primary:'primary-button',secondary:'secondary-button',text:'',quiet:'',icon:'icon-button'};
export const ActionButton=forwardRef<HTMLButtonElement,ButtonProps>(function ActionButton({variant='primary',loading=false,disabled,className='',type='button',children,...rest},ref){
 const unique=useId().replace(/[^a-z0-9-]/gi,'').toLowerCase();
 return <button ref={ref} {...rest} type={type} disabled={disabled||loading} aria-busy={loading||undefined} className={`nexify-control ${legacyClass[variant]} ${className}`} data-variant={variant} data-testid={rest['data-testid']||`action-button-${unique}`}>
  {loading&&<span className="control-loading-indicator" aria-hidden="true"/>}{children}
 </button>;
});
export const ActionLink=({variant='text',className='',children,...rest}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string;variant?:ActionVariant;'data-testid'?:string})=>{
 const unique=useId().replace(/[^a-z0-9-]/gi,'').toLowerCase();
 return <SiteLink {...rest} className={`nexify-control ${legacyClass[variant]} ${className}`} data-variant={variant} data-testid={rest['data-testid']||`action-link-${unique}`}>{children}</SiteLink>;
};
