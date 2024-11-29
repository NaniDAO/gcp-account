# gcp-account

A Viem account implementation for Google Cloud Platform (GCP) Key Management Service (KMS).

## Installation

```bash
npm install @nanidao/gcp-account
```

## Features

- Create Ethereum accounts using GCP KMS
- Sign messages, transactions, and typed data
- Compatible with Viem's LocalAccount interface
- Supports both string credentials and structured GCP key credentials

## Usage

```typescript
import { toGcpAccount } from '@nanidao/gcp-account';

// Using structured credentials
const credentials = {
  projectId: 'your-project-id',
  locationId: 'your-location',
  keyRingId: 'your-keyring',
  keyId: 'your-key-id',
  keyVersion: 'your-key-version'
};

// Create GCP account
const account = await toGcpAccount({ credentials });

// Using string credentials (full key path)
const stringCredentials = 'projects/your-project/locations/your-location/keyRings/your-keyring/cryptoKeys/your-key/cryptoKeyVersions/1';
const accountWithStringCreds = await toGcpAccount({ credentials: stringCredentials });

// Sign message
const signature = await account.signMessage({
  message: 'Hello World'
});

// Sign transaction
const signedTx = await account.signTransaction({
  to: '0x...',
  value: 1000000000000000000n,
  // ... other transaction parameters
});

// Sign typed data
const signedData = await account.signTypedData({
  // ... your typed data
});
```

## Requirements

- Node.js 14 or later
- Google Cloud Platform account with KMS enabled
- Properly configured GCP credentials in your environment

## Authentication

Make sure you have authenticated with GCP before using this package. You can authenticate using one of these methods:

1. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to your service account key file
2. Use `gcloud auth application-default login` if you're using the Google Cloud SDK
3. Set up ADC (Application Default Credentials) in your environment

## Dependencies

- `viem`: For Ethereum account and transaction handling
- `@google-cloud/kms`: For interacting with Google Cloud KMS
- `@noble/curves`: For secp256k1 cryptographic operations
- `asn1js`: For ASN.1 data structure handling

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
