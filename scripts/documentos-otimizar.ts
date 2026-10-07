import { PDFDocument,PDFRawStream,PDFName,PDFNumber,PDFArray,decodePDFRawStream } from 'pdf-lib';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
/** Mantém páginas, texto e vetores. Reduz imagens RGB/cinza e preserva as máscaras de transparência. */
export async function otimizarPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  const imagens=new Map<string,{data:Buffer;info:{width:number;height:number}}>();
  for(const [ref,obj] of pdf.context.enumerateIndirectObjects()) {
    if(!(obj instanceof PDFRawStream) || obj.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image')) continue;
    const dict=obj.dict;
    if(['Mask','Decode','DecodeParms'].some(k=>dict.has(PDFName.of(k)))) continue;
    const cor=dict.get(PDFName.of('ColorSpace'));
    let canais=cor===PDFName.of('DeviceRGB')?3:cor===PDFName.of('DeviceGray')?1:0;
    if(cor instanceof PDFArray && cor.get(0)===PDFName.of('ICCBased')) {
      const profile=pdf.context.lookup(cor.get(1));
      if(profile instanceof PDFRawStream) {const n=profile.dict.get(PDFName.of('N'));if(n instanceof PDFNumber && [1,3].includes(n.asNumber())) canais=n.asNumber();}
    }
    const bits=dict.get(PDFName.of('BitsPerComponent'));
    const w=dict.get(PDFName.of('Width')),h=dict.get(PDFName.of('Height'));
    const filter=dict.get(PDFName.of('Filter'));
    if((!canais && filter!==PDFName.of('DCTDecode')) || !(bits instanceof PDFNumber) || bits.asNumber()!==8 || !(w instanceof PDFNumber) || !(h instanceof PDFNumber) || obj.contents.length<100_000) continue;
    const width=w.asNumber(),height=h.asNumber();
    let imagem;
    try {
      const chave=createHash('sha256').update(obj.contents).digest('hex');
      let resultado=imagens.get(chave);
      if(!resultado) {
      if(filter===PDFName.of('DCTDecode')) {
        imagem=sharp(obj.contents);
        const metadata=await imagem.metadata();
        if(metadata.space==='cmyk') continue;
      }
      else {
        const raw=decodePDFRawStream(obj).decode();
        if(raw.length!==width*height*canais) continue;
        imagem=sharp(raw,{raw:{width,height,channels:canais as 1|3}});
      }
      resultado=await imagem.resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').jpeg({quality:88}).toBuffer({resolveWithObject:true});
      imagens.set(chave,resultado);
      }
      const {data,info}=resultado;
      if(data.length>=obj.contents.length) continue;
      const softRef=dict.get(PDFName.of('SMask'));
      let novoSoft;
      if(softRef) {
        const soft=pdf.context.lookup(softRef);
        if(!(soft instanceof PDFRawStream) || ['Decode','DecodeParms','Matte'].some(k=>soft.dict.has(PDFName.of(k)))) continue;
        const raw=decodePDFRawStream(soft).decode();
        if(raw.length!==width*height) continue;
        const reduzido=await sharp(raw,{raw:{width,height,channels:1}}).resize(info.width,info.height).greyscale().raw().toBuffer();
        novoSoft=pdf.context.register(pdf.context.flateStream(reduzido,{Type:'XObject',Subtype:'Image',Width:info.width,Height:info.height,ColorSpace:'DeviceGray',BitsPerComponent:8}));
      }
      pdf.context.assign(ref,pdf.context.stream(data,{Type:'XObject',Subtype:'Image',Width:info.width,Height:info.height,ColorSpace:'DeviceRGB',BitsPerComponent:8,Filter:'DCTDecode',...(novoSoft?{SMask:novoSoft}:{})}));
    } catch { /* Imagem com codificação especial: conserva os bytes originais. */ }
  }
  const resultado=await pdf.save({useObjectStreams:true});
  return resultado.length<bytes.length ? resultado : bytes;
}
