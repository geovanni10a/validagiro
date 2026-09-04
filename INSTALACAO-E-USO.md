# Guia completo — ValidaGiro

Este pacote contém três partes:

1. **Aplicativo Android:** usado para ler códigos e cadastrar lotes no estoque.
2. **Servidor ValidaGiro:** executado no computador principal e responsável por sincronizar os aparelhos.
3. **Painel Estoque 3D:** aberto em qualquer navegador da rede, no celular ou em outros PCs.

## 1. Preparar o computador principal

### Requisitos

- Windows 10 ou 11 de 64 bits;
- Node.js LTS 20 ou mais recente: <https://nodejs.org/>;
- computador conectado à mesma rede Wi-Fi ou cabeada dos celulares;
- permissão para liberar o Node.js no Firewall do Windows.

### Instalação rápida

1. Extraia o ZIP para uma pasta permanente, por exemplo `C:\ValidaGiro`.
2. Abra a pasta extraída.
3. Execute `PREPARAR-PROJETO.bat` uma vez.
4. Execute `INICIAR-SERVIDOR.bat` sempre que a loja for utilizar o sistema.
5. Quando o Windows perguntar sobre o firewall, marque **Redes privadas** e clique em **Permitir acesso**.
6. A janela exibirá endereços parecidos com:

   ```text
   Neste computador: http://localhost:3333
   Na rede local:    http://192.168.1.10:3333
   ```

7. Anote o endereço da rede local. Ele será usado nos celulares e outros computadores.

Não feche a janela do servidor durante o uso.

## 2. Instalar o APK no Android

1. Copie o arquivo `ValidaGiro-1.0.0.apk` para o celular por cabo USB, Drive, WhatsApp ou outro meio confiável.
2. Abra o arquivo no celular.
3. Se o Android bloquear, abra a opção apresentada na tela e permita **Instalar apps desconhecidos** somente para o aplicativo usado para abrir o APK.
4. Toque em **Instalar**.
5. Abra o ValidaGiro e autorize o uso da câmera.

Para atualizar uma instalação anterior, basta abrir o APK mais novo. Como o identificador Android foi preservado, o sistema tentará instalar como atualização. Nunca desinstale a versão antiga antes de confirmar que os dados foram sincronizados ou copiados.

## 3. Conectar o primeiro celular

1. Verifique se o celular está na mesma rede do computador principal.
2. No ValidaGiro, toque na engrenagem da tela inicial.
3. Em **Endereço do servidor**, informe o endereço anotado, incluindo `http://` e a porta `:3333`.
4. Exemplo: `http://192.168.1.10:3333`.
5. Toque em **Salvar endereço**.
6. Toque em **Sincronizar agora**.

O aplicativo continua funcionando offline. Quando a rede voltar, use **Sincronizar agora** para enviar e receber as alterações.

## 4. Adicionar outros celulares

Repita a instalação do APK e configure exatamente o mesmo endereço do servidor em todos os aparelhos. Antes de começar um turno e depois de terminar cadastros importantes, toque em **Sincronizar agora**.

Recomendação operacional:

- sincronize antes de cadastrar para receber o estoque atualizado;
- faça os cadastros normalmente, mesmo se a rede cair;
- sincronize novamente ao terminar;
- evite editar o mesmo lote ao mesmo tempo em dois aparelhos. Se isso acontecer, a alteração mais recente será mantida.

## 5. Abrir em outros computadores

Não é necessário instalar o projeto nos outros PCs.

1. Conecte o computador à mesma rede.
2. Abra Chrome, Edge ou Firefox.
3. Digite o endereço do servidor, por exemplo `http://192.168.1.10:3333`.

O painel mostra indicadores, pesquisa e o estoque 3D. Arraste o mouse para girar, use a roda para aproximar e clique nas caixas para consultar produto, lote, validade, quantidade e localização.

## 6. Como usar o estoque 3D

Cada estrutura representa uma localização:

- Estoque;
- Área de venda;
- Geladeira;
- Congelador.

Cada caixa representa um lote. As cores indicam:

| Cor | Situação |
| --- | --- |
| Verde | mais de 60 dias |
| Amarelo | 31 a 60 dias |
| Laranja | 15 a 30 dias |
| Vermelho | 0 a 14 dias |
| Vinho | vencido |

No aplicativo, abra a aba **Mapa** e toque em **Abrir estoque 3D interativo** para usar a mesma visualização no celular.

## 7. Cadastrar produtos e lotes

1. Na tela inicial, toque em **Ler código de barras** ou **Digitar código**.
2. Se o produto for novo, preencha seus dados permanentes.
3. Informe validade, lote, quantidade, localização, entrada e informações opcionais.
4. Revise e salve.
5. Para registrar outro lote do mesmo produto, leia o mesmo código novamente.

As abas disponíveis são:

- **Início:** resumo e registro rápido;
- **Estoque:** pesquisa, filtros e detalhes;
- **Alertas:** lotes agrupados por proximidade do vencimento;
- **Mapa:** organização por localização e acesso ao 3D.

## 8. Backup e recuperação

Os dados sincronizados ficam em `server\data\store.json` no computador principal.

Para fazer backup:

1. execute `FAZER-BACKUP.bat`;
2. copie a pasta `backups` para um pendrive, Drive ou armazenamento seguro.

Para restaurar:

1. feche o servidor;
2. guarde uma cópia do arquivo atual `server\data\store.json`;
3. copie o backup desejado para `server\data\store.json`;
4. inicie o servidor novamente;
5. sincronize os celulares.

## 9. Problemas comuns

### O celular não conecta

- confirme se a janela do servidor está aberta;
- use o endereço da rede local, nunca `localhost` no celular;
- confirme que os dois aparelhos estão na mesma rede;
- desative temporariamente a rede móvel do celular para testar;
- permita o Node.js nas redes privadas do Firewall do Windows;
- redes de visitantes podem impedir que os dispositivos se enxerguem.

### O endereço IP mudou

Reinicie o servidor, copie o novo endereço exibido e atualize a configuração nos celulares. Para evitar mudanças, configure uma reserva de IP no roteador para o computador principal.

### A câmera não abre

Abra **Configurações do Android → Aplicativos → ValidaGiro → Permissões → Câmera** e permita o acesso. Também é possível digitar o código manualmente.

### O painel 3D está lento

Atualize o navegador e ative a aceleração de hardware. O mapa exibe até 48 caixas por localização; todos os lotes continuam disponíveis na lista lateral.

## 10. Uso fora da rede da loja

O servidor fornecido é preparado para rede local. Para acesso remoto, não exponha diretamente a porta 3333 na internet. Use uma VPN privada, como Tailscale/ZeroTier, ou hospede o servidor atrás de HTTPS e autenticação com apoio técnico.

## 11. Gerar uma nova versão do APK

O caminho mais simples é o EAS Build:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Para compilação Android totalmente local, instale Android Studio/JDK 17, execute `npx expo prebuild --platform android` e depois `android\gradlew.bat assembleRelease`. Consulte `GUIA-DE-BUILD-APK.md` neste pacote para os detalhes.
