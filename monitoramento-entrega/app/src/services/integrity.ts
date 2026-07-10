import * as Crypto from 'expo-crypto';

export async function gerarHash256(dados: any): Promise<string> {
  const json = typeof dados === 'string' ? dados : JSON.stringify(dados);
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, json);
  return hash;
}
