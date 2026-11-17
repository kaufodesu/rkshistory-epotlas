/* wither: bounded, on-demand map loading. No historical interpolation. */
(function(root){
  'use strict';
  class AtlasStore {
    constructor(manifest,normalize,options={}){
      this.maps=manifest.maps;this.normalize=normalize;
      this.fetch=options.fetch||root.fetch.bind(root);
      this.maxEntries=options.maxEntries||3;this.maxBytes=options.maxBytes||24*1024*1024;
      this.cache=new Map();this.pending=new Map();this.estimatedBytes=0;
    }
    record(year){const r=this.maps[String(year)];if(!r||typeof r.url!=='string')throw new Error('この年代の地図が登録されていません。');return r;}
    key(year){const r=this.record(year);return r.url+'@'+r.sourceYear;}
    cancelExcept(years){
      const keep=new Set(years.map(y=>this.key(y)));
      for(const [key,job] of this.pending)if(!keep.has(key)){this.pending.delete(key);job.controller.abort();}
    }
    async get(year){
      const record=this.record(year),key=this.key(year);
      if(this.cache.has(key)){
        const item=this.cache.get(key);this.cache.delete(key);this.cache.set(key,item);return item.features;
      }
      if(this.pending.has(key))return this.pending.get(key).promise;
      const controller=new AbortController(),job={controller,promise:null};
      job.promise=(async()=>{
        if(root.location?.protocol==='file:')throw new Error('公開版はGitHub PagesなどのURLで開いてください。HTMLの直接起動では地図を取得できません。');
        const response=await this.fetch(record.url,{signal:controller.signal,cache:'default'});
        if(!response.ok)throw new Error('地図を取得できませんでした（HTTP '+response.status+'）。mapsフォルダーも公開されているか確認してください。');
        let buffer=await response.arrayBuffer();
        if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
        const bytes=new Uint8Array(buffer);
        let text;
        if(bytes[0]===0x1f&&bytes[1]===0x8b){
          if(!root.DecompressionStream)throw new Error('このブラウザは地図の展開に未対応です。最新版のChrome・Edge・Firefox・Safariをお使いください。');
          text=await new Response(new Blob([buffer]).stream().pipeThrough(new root.DecompressionStream('gzip'))).text();
        }else{text=new TextDecoder().decode(buffer);}
        if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
        const data=JSON.parse(text);
        if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('地図データの形式が正しくありません。');
        const features=this.normalize(data);
        for(const feature of features)feature.mapYear=record.sourceYear;
        const estimate=text.length*3;
        if(estimate<=this.maxBytes){
          this.cache.set(key,{features,estimate});this.estimatedBytes+=estimate;
          while(this.cache.size>this.maxEntries||this.estimatedBytes>this.maxBytes){
            const oldest=this.cache.keys().next().value;
            this.estimatedBytes-=this.cache.get(oldest).estimate;this.cache.delete(oldest);
          }
        }
        return features;
      })().finally(()=>{if(this.pending.get(key)===job)this.pending.delete(key);});
      this.pending.set(key,job);return job.promise;
    }
  }
  root.AtlasStore=AtlasStore;
  if(typeof module==='object'&&module.exports)module.exports=AtlasStore;
})(globalThis);
