import Image from 'next/image';
import Link from 'next/link';

export function ContactPreview() {
  return (
    <section id="contact" className="bg-chi-green-deep text-chi-cream py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-12">
        {/* COLUNA ESQUERDA — Texto + Info */}
        <div>
          <span className="text-chi-gold mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
            — Visite-nos —
          </span>

          <h2 className="mb-6 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
            Estamos à sua <span className="text-chi-gold italic">espera</span>.
          </h2>

          <p className="text-chi-cream/75 mb-12 max-w-md text-base leading-[1.85] md:text-lg">
            No coração da Quinta da Bicuda, num espaço pensado ao detalhe para receber quem procura
            mais do que um serviço — uma experiência.
          </p>

          {/* Grid de informação */}
          <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {/* Morada */}
            <div>
              <h5 className="text-chi-gold mb-3 text-[10px] font-medium tracking-[0.28em] uppercase">
                Morada
              </h5>
              <p className="text-chi-cream font-serif text-lg leading-[1.6] md:text-xl">
                R. Estorninho, Loja E
                <br />
                Quinta da Bicuda
                <br />
                2750-686 Cascais
              </p>
            </div>

            {/* Contacto */}
            <div>
              <h5 className="text-chi-gold mb-3 text-[10px] font-medium tracking-[0.28em] uppercase">
                Contacto
              </h5>
              <p className="text-chi-cream font-serif text-lg leading-[1.6] md:text-xl">
                <Link href="tel:+351932932691" className="hover:text-chi-gold transition-colors">
                  +351 932 932 691
                </Link>
                <br />
                <Link
                  href="mailto:reservas@chisublime.pt"
                  className="hover:text-chi-gold transition-colors"
                >
                  reservas@chisublime.pt
                </Link>
              </p>
            </div>

            {/* Horário (ocupa 2 colunas) */}
            <div className="sm:col-span-2">
              <h5 className="text-chi-gold mb-4 text-[10px] font-medium tracking-[0.28em] uppercase">
                Horário
              </h5>
              <ul className="space-y-2.5">
                <li className="border-chi-gold/15 flex items-center justify-between border-b pb-2.5 text-sm">
                  <span className="text-chi-cream/70">Segunda — Sexta</span>
                  <span className="text-chi-gold font-medium">10h00 — 19h00</span>
                </li>
                <li className="border-chi-gold/15 flex items-center justify-between border-b pb-2.5 text-sm">
                  <span className="text-chi-cream/70">Sábado</span>
                  <span className="text-chi-cream/40 italic">Encerrado</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-chi-cream/70">Domingo</span>
                  <span className="text-chi-cream/40 italic">Encerrado</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="#contact"
            className="bg-chi-gold text-chi-green-deep hover:bg-chi-gold-soft hover:text-chi-green-darker hover:shadow-gold inline-block px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
          >
            Reservar Agora
          </Link>
        </div>

        {/* COLUNA DIREITA — Imagem com overlay */}
        <div className="border-chi-gold/25 relative aspect-square overflow-hidden border">
          <Image
            src="/images/philosophy.jpg"
            alt="Chi Sublime · Quinta da Bicuda, Cascais"
            fill
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          {/* Overlay escuro */}
          <div className="to-chi-green-darker/85 absolute inset-0 bg-gradient-to-b from-transparent via-transparent" />

          {/* Conteúdo overlay no fundo */}
          <div className="text-chi-cream absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
            <svg
              width="36"
              height="36"
              viewBox="0 0 50 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-chi-gold mb-3"
            >
              <path d="M25 8C18 8 13 14 13 22C13 32 25 42 25 42C25 42 37 32 37 22C37 14 32 8 25 8Z" />
              <circle cx="25" cy="22" r="3.5" fill="currentColor" />
            </svg>
            <p className="font-serif text-lg italic md:text-xl">
              Quinta da Bicuda · Cascais, Portugal
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
