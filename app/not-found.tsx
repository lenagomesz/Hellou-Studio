import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-pink-50">
        <span className="text-4xl">🔍</span>
      </div>

      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-600">
        O endereço que você procura não existe ou foi removido. Que tal explorar
        nosso catálogo?
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Ver catálogo
        </Link>
        <Link
          href="/"
          className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
