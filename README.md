# Exercício 2: Interface 3D

Ambientes de Realidade Virtual, 2026

Uma sala escura com uma televisão antiga de tubo e uma mesa de botões à frente. Cada botão muda de canal e mostra uma imagem ou um vídeo no ecrã grande, com estática e som de interferência na passagem entre canais. Os três primeiros canais são fotografias dos observatórios do ALMA, do Paranal e de La Silla, e o quarto é um vídeo. O último botão serve para pôr o vídeo em pausa ou voltar a reproduzi-lo.

Os botões têm vários estados: normal, com o cursor ou o dedo por cima (fica mais claro, sobe ligeiramente e faz um som curto), pressionado (afunda e acende) e selecionado (a luz por cima do botão fica acesa enquanto o canal estiver ativo). O botão de pausa fica desativado, a cinzento, quando o canal atual não é o vídeo.

## Interação

No computador usa-se o rato: arrastar para olhar à volta e clicar nos botões. Em realidade virtual os comandos têm um raio que funciona da mesma forma, carregando no gatilho, e com o seguimento de mãos basta carregar no botão com a ponta do dedo indicador.

## Como testei

No computador testei com o rato no Chrome. Para a parte de realidade virtual não tive óculos, por isso usei o emulador IWER com o perfil de um Meta Quest 2, apontei o raio do comando aos botões e carreguei no gatilho, e depois mudei para o modo de mãos e carreguei nos botões com o dedo. Não testei em óculos reais.

## Como executar

É preciso abrir a página através de um servidor local, porque o vídeo e as imagens não carregam a partir do ficheiro diretamente. Na pasta do projeto:

```
python -m http.server 8000
```

E depois abrir `http://localhost:8000` no browser. Os modelos das mãos são carregados do site do A-Frame, por isso é necessária ligação à internet para os ver.

## Créditos

Fotografias da ESO, usadas com atribuição segundo a política de imagens da ESO:
ALMA: ESO/B. Tafreshi (twanight.org); Paranal: Y. Beletsky (LCO)/ESO; La Silla: ESO/B. Tafreshi.
O vídeo foi feito a partir da fotografia do Paranal. Os sons foram gerados por código. Biblioteca A-Frame 1.8.0.
