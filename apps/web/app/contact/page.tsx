import Link from "next/link";

export const metadata = { title: "Contact | Signal Scout" };

export default function Contact() {
  return (
    <main className="shell min-h-screen py-16">
      <header className="flex items-center justify-between border-b border-line pb-6">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/" className="text-sm text-muted">
          ← Signal Scout
        </Link>
      </header>
      <section className="max-w-2xl">
        <div className="eyebrow mb-4 mt-12">Contact</div>
        <h1 className="text-4xl font-extrabold">Report an issue</h1>
        <p className="mt-5 leading-7 text-muted">
          For a technical bug or attribution concern about a publicly collected
          item, the repository issue tracker is public. Include only the public
          source URL and a short reason; do not include names, private
          correspondence, personal information, passwords, API keys, or other
          secrets.
        </p>
        <p className="mt-4 leading-7 text-muted">
          This prototype does not yet have a private request channel. Do not
          post a privacy or personal-data request in the public issue tracker;
          the product is not ready for requests that require confidential
          contact.
        </p>
        <a
          className="btn mt-7"
          href="https://github.com/arnavsharma0727/Signal-Scout/issues"
          target="_blank"
          rel="noreferrer"
        >
          Open a GitHub issue
        </a>
      </section>
    </main>
  );
}
