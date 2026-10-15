import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['roster','combat','arena-catalog','arenas','audio','fighters','sprites','country-art','country-sprites','game'];
const sources=await Promise.all(files.map(name=>readFile(path.join(root,'browser/src',name+'.js'),'utf8')));
const imageFiles={JAPAN:'japan-poses.png',PAKISTAN:'pakistan-poses.png',HEADS:'fighter-heads.png',BODY:'fighter-body.png'};
let script=sources.join('\n;\n');
const arenaMetadata=JSON.parse(await readFile(path.join(root,'browser/assets/arenas/metadata.json'),'utf8'));
const arenaImages=Object.fromEntries(await Promise.all(Object.keys(arenaMetadata).map(async id=>[id,'data:image/webp;base64,'+(await readFile(path.join(root,'browser/assets/arenas',id+'.webp'))).toString('base64')])));
script=script.replace('/* ARENA_IMAGE_DATA */null',()=>JSON.stringify(arenaImages));
const countryArt=JSON.parse(await readFile(path.join(root,'browser/assets/countries/metadata.json'),'utf8'));
const countryFolder=path.join(root,'browser/country-art');await mkdir(countryFolder,{recursive:true});
const countryFiles={},countryPortraits={};
for(const id of Object.keys(countryArt)){
 const sourceId=countryArt[id].sourceCountryId||id;
 const image='data:image/webp;base64,'+(await readFile(path.join(root,'browser/assets/countries',sourceId+'.webp'))).toString('base64');
 await writeFile(path.join(countryFolder,id+'.js'),'window.NationCountrySprites.register('+JSON.stringify(id)+','+JSON.stringify(image)+');\n');
 countryFiles[id]='country-art/'+id+'.js';
 countryPortraits[id]='data:image/webp;base64,'+(await readFile(path.join(root,'browser/assets/countries',sourceId+'-portrait.webp'))).toString('base64');
}
script=script.replace('/* COUNTRY_ASSET_FILES */null',()=>JSON.stringify(countryFiles));
script=script.replace('/* COUNTRY_PORTRAIT_DATA */null',()=>JSON.stringify(countryPortraits));
for(const [key,file]of Object.entries(imageFiles)){
 const png=await readFile(path.join(root,'browser/assets',file));
 script=script.replace(`/* ${key}_IMAGE_DATA */`,()=>`data:image/png;base64,${png.toString('base64')}`);
}
for(const key of ['fight','ko','getready','timeover']){
 const wav=await readFile(path.join(root,'browser/assets/audio',key+'.wav'));
 script=script.replace(`/* AUDIO_${key.toUpperCase()}_DATA */`,()=>`data:audio/wav;base64,${wav.toString('base64')}`);
}
const template=await readFile(path.join(root,'browser/template.html'),'utf8');
const flagLicense=await readFile(path.join(root,'browser/assets/flags/LICENSE.txt'),'utf8');
const credits='<!-- National flag SVGs: lipis/flag-icons 7.5.0.\n'+flagLicense.replace(/--/g,'—')+'\nFighter atlases prepared with image generation; Pakistan/Japan source images supplied by the user.\nArena artwork supplied by the user; synthesized music/impacts and offline eSpeak NG announcer cues.\n-->\n';
const html=template.replace('<head>',()=>'<head>\n'+credits).replace('<script>/* COMBAT_SOURCE */</script><script>/* GAME_SOURCE */</script>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
if(/\/\* (?:[A-Z]+_IMAGE_DATA|AUDIO_[A-Z]+_DATA|COMBAT_SOURCE|GAME_SOURCE) \*\//.test(html))throw new Error('Unresolved standalone asset placeholder');
await writeFile(path.join(root,'browser/index.html'),html);
const output=process.env.NATIONCLASH_ARTIFACT_DIR||path.join(root,'artifacts');await mkdir(output,{recursive:true});
await cp(countryFolder,path.join(output,'country-art'),{recursive:true});
await writeFile(path.join(output,'NationClash.html'),html);await writeFile(path.join(output,'NationClash-World-196.html'),html);
console.log('Built world game: '+Buffer.byteLength(html)+' HTML bytes + '+Object.keys(countryFiles).length+' lazy country asset files in browser/country-art; package the complete folder for offline play.');
