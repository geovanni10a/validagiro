# ValidaGiro Mobile

Aplicativo Expo/React Native do fluxo de leitura e cadastro de produto/lote.

## Executar

1. Copie `.env.example` para `.env` e configure `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_STORE_ID`.
2. Para desenvolvimento local, `EXPO_PUBLIC_ACCESS_TOKEN` pode receber um JWT temporário. Em produção, o token deve vir da sessão autenticada.
3. Execute `npm install` e `npm run android`.

No emulador Android, `10.0.2.2` aponta para o computador host. Em aparelho físico, use o IP local da máquina que executa a API.

## Qualidade

```sh
npm run lint
npm run typecheck
npm test
```

Os rascunhos e envios pendentes são mantidos em SQLite no aparelho. Uma repetição do mesmo registro sempre reutiliza o `clientRequestId` persistido. Ao recuperar a conexão, o consumidor local consulta primeiro o estado remoto e só então repete o envio com a mesma chave.

A data de entrada usa o fuso retornado pelo contexto da loja. `EXPO_PUBLIC_STORE_TIMEZONE` é apenas a contingência offline antes de o contexto ser carregado.

O upload de foto permanece fora deste recorte porque ainda não existe contrato de mídia na API. O formulário informa que a foto é opcional sem bloquear o fluxo.
