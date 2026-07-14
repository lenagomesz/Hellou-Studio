import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const contentType = 'image/png';
export const size = { width: 180, height: 180 };

export default async function AppleIcon() {
  const logoData = await readFile(join(process.cwd(), 'public/logo-512.png'));
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#fafafa',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse exige elemento HTML nativo. */}
        <img
          src={logoBase64}
          alt=""
          width={180}
          height={180}
          style={{ objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  );
}
