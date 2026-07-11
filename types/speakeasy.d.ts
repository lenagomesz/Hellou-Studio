declare module 'speakeasy' {
  interface Secret {
    base32: string;
    otpauth_url: string;
  }

  interface VerifyOptions {
    secret: string;
    encoding: string;
    token: string;
    window?: number;
  }

  export function generateSecret(options: {
    name: string;
    issuer: string;
  }): Secret;

  export const totp: {
    verify(options: VerifyOptions): boolean | null;
  };
}
