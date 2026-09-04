# ValidaGiro

Aplicativo offline para cadastro, localização e controle de validade de produtos. Este projeto foi reconstruído a partir do APK `ValidaGiro-Teste-v0.1.1` e ampliado para uma versão funcional completa.

Para instalar o sistema completo em uma loja, comece pelo [guia de instalação e uso](./INSTALACAO-E-USO.md).

O APK pronto para instalação está na raiz do pacote: `ValidaGiro-1.0.0.apk`.

## Funcionalidades

- leitura de códigos EAN-8, EAN-13, UPC-A e UPC-E pela câmera;
- entrada manual de códigos;
- cadastro permanente do produto e registro de múltiplos lotes;
- armazenamento offline em SQLite;
- rascunhos de cadastros incompletos;
- pesquisa por produto, código, lote ou localização;
- edição e exclusão de lotes;
- alertas automáticos por proximidade do vencimento;
- mapa visual do estoque por localização;
- mapa 3D WebGL interativo, acessível no aplicativo e em navegadores;
- servidor local e sincronização entre celulares e computadores;
- dashboard com quantidade, lotes e itens críticos.

## Executar no Expo Go

Requisitos: Node.js 20 ou superior e o aplicativo Expo Go no celular.

```bash
npm install
npx expo start
```

Leia o QR Code exibido no terminal usando o Expo Go. O celular e o computador devem estar na mesma rede. Se a rede bloquear a conexão local, execute `npx expo start --tunnel`.

## Gerar um APK de teste

Instale o EAS CLI, autentique a conta Expo e inicie o perfil `preview`:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

O identificador Android preservado do APK original é `com.geovanni10a.validagiro.offline`.

## Estrutura

- `App.tsx`: navegação principal e abas;
- `src/data/repository.ts`: banco SQLite, consultas e gravações;
- `src/context/InventoryContext.tsx`: estado compartilhado do estoque;
- `src/screens/`: telas e fluxos;
- `src/components/ui.tsx`: componentes visuais reutilizáveis;
- `src/utils.ts`: datas, dinheiro e classificação de validade.
- `server/`: sincronização e painel 3D para a rede local.

## Faixas de validade

| Situação | Prazo |
| --- | --- |
| Longo prazo | mais de 60 dias |
| Atenção | 31 a 60 dias |
| Urgente | 15 a 30 dias |
| Crítico | 0 a 14 dias |
| Vencido | data anterior a hoje |

Sem servidor, os dados permanecem no aparelho. Ao configurar o servidor local incluído, celulares e computadores compartilham o estoque por sincronização e o arquivo `server/data/store.json` pode ser copiado como backup. Para expor o sistema na internet ou operar várias lojas, adicione autenticação, HTTPS e uma rotina de backup administrada.
