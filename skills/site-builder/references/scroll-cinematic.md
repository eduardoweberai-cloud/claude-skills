# Modo cinematográfico: scroll-video 3D

Fonte: truque central do vídeo de Zubair Trabzada. O "site 3D com scroll" premiado raramente é WebGL/Three.js: é um vídeo de alta qualidade fatiado em frames estáticos que avançam sincronizados à posição do scroll (padrão consagrado pela Apple nas páginas de produto).

## Requisitos

- Vídeo fonte de ALTA qualidade (o requisito duro é o modelo de vídeo: Seedance 2.0 em 4K; Kling ou Veo 3.1 servem). Vídeo ruim = site ruim, o truque não esconde artefato.
- Movimento de câmera contínuo e lento no vídeo (dolly, orbit, descida). Cortes de cena quebram a ilusão.
- 5 a 10 segundos de vídeo bastam para uma jornada de scroll longa.

## Pipeline

### 1. Fatiar o vídeo em frames (FFmpeg)

```bash
# ~12 fps de amostragem é o equilíbrio peso x fluidez (5s de vídeo = ~60 frames)
ffmpeg -i assets/raw/vid-hero.mp4 -vf "fps=12,scale=1920:-2" -q:v 3 assets/frames/frame_%04d.jpg
```

Depois converter os frames para WebP (pipeline padrão) e medir o peso total. Alvo: conjunto completo abaixo de ~8 MB; se passar, reduzir fps para 8-10 ou o scale para 1600.

### 2. Renderizar em canvas sincronizado ao scroll

Base pronta em `assets/scroll-video-template.html`. Mecânica:
- Um `<canvas>` fixo (position: sticky/fixed) dentro de um container alto (ex: `height: 500vh`): a altura do container define a "duração" do scroll.
- Progresso = `scrollTop / (scrollHeight - viewportHeight)` do container, mapeado para o índice do frame.
- Pré-carregar todos os frames em `Image()` antes de liberar o scroll (tela de loading com contador); desenhar via `requestAnimationFrame` só quando o índice muda.
- Overlays de texto/copy entram como camadas absolutas com opacity/transform dirigidos pelo mesmo progresso (as "zonas" da narrativa da Fase 4).

### 3. Sobreposições narrativas

Mapear cada seção do plano narrativo para uma faixa de progresso (ex: zona 1 = 0.00-0.25). No handler de scroll, alternar classes das camadas conforme a faixa. Microdetalhes que elevam (vistos no Abyssal): indicador lateral de progresso temático (profundidade, altitude, timeline) e um elemento que "responde" ao avanço (luz que acende, cor que esfria).

## Fallbacks obrigatórios

- **Mobile**: conjunto de frames menor (ex: scale 900) ou degradar para `<video>` em autoplay com `playsinline`; testar o peso em rede móvel.
- **`prefers-reduced-motion: reduce`**: pular a sincronização e mostrar frame estático + conteúdo em fluxo normal.
- **JS desabilitado/erro de preload**: primeiro frame como imagem estática de fundo.

## Alternativas quando scroll-video não cabe

- GSAP ScrollTrigger para parallax/pin de elementos (efeito "quase 3D" sem vídeo, peso mínimo). Há skills GSAP públicas (greensock) instaláveis se necessário.
- CSS scroll-driven animations (`animation-timeline: scroll()`) para efeitos leves, sem JS.
