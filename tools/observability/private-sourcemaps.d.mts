export type MapPolicy={enabled:boolean;release:string;surface:string;destination:string};
export function mapPolicy(env:Record<string,string|undefined>,surface:string,root:string):MapPolicy;
export function escrowMaps(output:string,policy:MapPolicy):Promise<void>;
export function privateMapPlugin(policy:MapPolicy):{name:string;apply:'build';configResolved(config:{root:string;build:{outDir:string}}):void;closeBundle():Promise<void>};
