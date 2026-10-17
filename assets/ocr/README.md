# Modelo de OCR

`por.traineddata` é o modelo de português do projeto oficial
[tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast/blob/main/por.traineddata),
distribuído sob Apache 2.0 (ver `LICENSE`).

É lido localmente pelo worker Tesseract.js na função de edição das publicações.
O modelo e o worker são incluídos pelo rastreio de ficheiros do Next.js.
Não é necessário descarregar dados de OCR em tempo de execução.
