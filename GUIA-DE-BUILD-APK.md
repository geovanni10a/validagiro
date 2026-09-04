# Preparação para gerar o APK

## Opção recomendada: EAS Build

1. Instale Node.js LTS.
2. Abra um terminal na pasta do projeto.
3. Execute:

   ```bash
   npm install
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform android --profile preview
   ```

4. Ao terminar, o EAS mostrará um link para baixar o APK.

O perfil `preview` já está configurado em `eas.json` para gerar um APK instalável.

## Opção local: Android Studio

Requisitos:

- JDK 17;
- Android Studio;
- Android SDK Platform 35;
- Android SDK Build-Tools;
- variável `ANDROID_HOME` apontando para o SDK.

Comandos:

```bash
npm install
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease
```

O arquivo será criado em `android\app\build\outputs\apk\release\app-release.apk`.

Para distribuição oficial na Play Store, gere e proteja uma chave de assinatura própria. Nunca publique senhas ou arquivos `.jks` no repositório.
