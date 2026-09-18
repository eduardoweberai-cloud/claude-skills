# Assets de imagem e vídeo

Fonte: nível 4 de Jack Roberts (OpenArt: Nano Banana 2 para imagem, Kling/Seedance para vídeo) + workflow Higgsfield de Zubair.

## Imagens

### Specs padrão (do vídeo do Jack, validadas para web)

| Parâmetro | Valor | Racional |
|---|---|---|
| Ratio | 21:9 para hero/banners wide; 16:9 ou 1:1 para cards | Wide preenche viewport sem crop feio |
| Resolução | 2K | "4K desnecessário, 1K baixo demais" |
| Variações | 2 a 4 por asset | Escolher a melhor, não iterar às cegas |
| Fundo | Branco quando o asset entra recortado/composto no site | Facilita integração e dark/light |

### Rotas de geração (em ordem de preferência)

1. **Prompt para ChatGPT/gpt-image (default, custo zero)**: usar a skill `image-prompt-generator` para escrever o prompt otimizado. Entregar todos os prompts do plano de uma vez (pack), o usuário renderiza e devolve os arquivos.
2. **Geração paga por API (ex.: nano-banana via fal.ai), se instalada**: só com autorização explícita de custo no run. Vantagem: sai pronto no disco, sem ida e volta.
3. **Assets reais do usuário**: sempre têm prioridade sobre geração (fotos de produto, logo, manual de marca). Nunca inventar identidade visual quando existe asset real.

### Formato do pack de prompts de imagem

```
### ASSET img-01: {nome} (seção {X})
Ferramenta: ChatGPT (gpt-image) | ratio 21:9 | 2K | 3 variações
Prompt:
{prompt completo}
Observação: fundo branco puro, sem texto na imagem.
```

## Vídeos (sempre manual: usuário roda em OpenArt/Higgsfield/etc)

### Regras de prompt (nível 4 do Jack)

- Modelo sugerido: **Seedance 2.0** (qualidade top, requisito duro para modo cinematográfico em 4K) ou **Kling**; Veo 3.1 como alternativa.
- **Start frame = imagem já gerada/aprovada** (nunca gerar vídeo do zero sem controlar o primeiro frame).
- **Loop perfeito: usar a MESMA imagem como start frame E end frame.** Elimina o "pulo" no loop e todo o retrabalho de continuidade. Essencial para vídeos de produto girando e backgrounds em loop.
- Enhanced prompt: ON (quando a ferramenta oferecer).
- Ratio 16:9 para seções; 21:9/4K quando o vídeo alimenta o modo cinematográfico (scroll-video).
- Prompt descreve o MOVIMENTO, não a cena (a cena vem do start frame). Exemplo literal do vídeo: "This is a product shot. Please rotate this phone for the video".

### Formato do prompt pack de vídeo (entregar e PAUSAR)

```
### ASSET vid-01: {nome} (seção {X})
Modelo: Seedance 2.0 (alternativa: Kling)
Start frame: img-03 (anexar)
End frame: img-03 (a mesma, para loop perfeito)
Ratio: 16:9 | Enhanced prompt: ON | Duração: 5s
Prompt de movimento:
{descrição só do movimento de câmera/objeto}
```

Após entregar o pack: pedir que o usuário salve os arquivos gerados em `assets/raw/` do projeto com os ids (`vid-01.mp4`) e avise. NÃO seguir para integração antes disso.

### Integração no site

- Vídeo de seção: `<video autoplay muted loop playsinline>` com poster (o start frame) e `preload="metadata"`. Sempre `muted` (autoplay exige) e fallback de imagem.
- Vídeo cinematográfico de scroll: NÃO usar tag video; fatiar em frames (ver `references/scroll-cinematic.md`).
- Comprimir antes de subir: `ffmpeg -i in.mp4 -c:v libx264 -crf 26 -preset slow -an out.mp4` (sem áudio; áudio em background de site é peso morto).

## Pós-produção de imagens (Fase 7)

Rodar o pipeline WebP responsivo: Pillow gera múltiplas larguras em WebP + componente `<picture>` + manifesto. Redução típica de ~86% no payload mobile. Nunca entregar site final com PNG/JPG cru de 2K direto no `<img>`.
