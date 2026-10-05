# Android Play release

The ordinary `mobile-build.yml` workflow continues to produce test APKs and an unsigned release AAB.

For a Google Play upload, use the manual workflow **Build signed Android Play release**.

Required GitHub Actions secrets:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`: base64-encoded upload keystore.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: upload-key alias.
- `ANDROID_KEY_PASSWORD`: upload-key password.

The signed workflow:

1. refuses to run when any signing secret is missing;
2. materializes the keystore only in the ephemeral runner temp directory;
3. verifies the key alias before building;
4. builds the production AAB with Gradle's injected signing properties;
5. verifies the resulting AAB signature with `jarsigner -strict`;
6. publishes the signed AAB, readiness report and SHA-256 checksum as a short-lived artifact;
7. deletes the temporary keystore even when the job fails.

Never commit a JKS/keystore, password or base64 key to the repository.
