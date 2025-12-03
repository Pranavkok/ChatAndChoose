import Link from "next/link";

export default function AdminPage() {
  return (
    <main
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat font-sans text-gray-900"
      style={{
        backgroundImage:
          "url('https://static.vecteezy.com/system/resources/previews/067/578/292/non_2x/luxury-modern-white-background-with-golden-curves-website-template-certificate-cover-and-presentation-vector.jpg')",
      }}
    >
      <div className="min-h-screen bg-white/70">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-amber-500">
              Dashboard
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Product Admin
            </h1>
          </div>
          <Link
            href="/admin/add-product"
            className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:bg-amber-400"
          >
            + Add Product
          </Link>
        </header>

        <section className="mx-auto mt-4 max-w-5xl rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
          <h2 className="text-lg font-medium text-gray-800">Inventory</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quickly review your catalog. Select a product to edit details or
            remove it from the storefront.
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-amber-200 bg-white/80 px-4 py-10 text-center text-sm text-gray-500">
            Product list coming soon. Connect this panel to your data source to
            list and manage products in real time.
          </div>
        </section>
      </div>
    </main>
  );
}

