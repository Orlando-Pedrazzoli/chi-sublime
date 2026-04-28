/**
 * Chi Sublime — SiteContent Model
 * ============================================================
 *
 * Conteúdo editável do website (textos da homepage, sobre, contactos).
 *
 * Estratégia: key-value flexível
 *  - Cada secção do site tem uma "key" única (ex: "home.hero", "footer.tagline")
 *  - O valor é flexível (Schema.Types.Mixed) — pode ser objeto complexo
 *  - Suporta i18n (PT/EN) preparado mesmo que por agora só usemos PT
 *  - Versioning leve via updatedAt + updatedBy (audit trail)
 *
 * Padrão de key:
 *   "page.section" ou "page.section.subsection"
 *   Ex: "home.hero", "home.philosophy", "footer.tagline"
 *
 * Exemplo de content para "home.hero":
 *   {
 *     pt: {
 *       eyebrow: "Hair Style & Beauty · Cascais",
 *       title: "Beleza que respira o tempo",
 *       subtitle: "Um espaço de cuidado refinado..."
 *     },
 *     en: { ... }
 *   }
 *
 * Quando o site renderiza a Homepage, faz:
 *   const hero = await SiteContent.findOne({ key: "home.hero" });
 *   const text = hero.content.pt.title;
 *
 * Se não existir entry, frontend usa um fallback estático no código.
 */

import mongoose, { Schema, model, models, type Model } from 'mongoose';

// ============================================================
// Tipo do documento
// ============================================================

/**
 * Tipo de conteúdo (categorização para o admin organizar)
 */
export type ContentType =
  | 'hero' // título/subtítulo de hero sections
  | 'section' // texto de uma secção (philosophy, about, etc.)
  | 'metadata' // info estrutural (telefone, morada, horário, etc.)
  | 'list' // listas (FAQs, valores, testemunhos)
  | 'raw'; // bloco genérico

export const CONTENT_TYPES: ContentType[] = ['hero', 'section', 'metadata', 'list', 'raw'];

export interface ISiteContent {
  _id: mongoose.Types.ObjectId;

  /** Chave única identificadora (ex: "home.hero", "footer.tagline") */
  key: string;

  /** Tipo de conteúdo (para organização no admin) */
  type: ContentType;

  /**
   * Conteúdo flexível, normalmente estruturado por idioma.
   * Forma típica:
   *   { pt: { ... }, en: { ... } }
   *
   * Mas pode ser qualquer JSON serializável.
   */
  content: {
    pt: Record<string, unknown>;
    en?: Record<string, unknown>;
  };

  /** Descrição interna para o admin (ex: "Hero da homepage") */
  label: string;

  /** Notas internas para o admin (orientações, dicas) */
  helperText?: string;

  /** Se está visível/ativo no site */
  active: boolean;

  /** Quem editou pela última vez */
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Schema
// ============================================================

const siteContentSchema = new Schema<ISiteContent>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
      // padrão: letras minúsculas, números, ponto e hífen
      // ex: "home.hero", "footer.tagline", "about.team-intro"
      match: /^[a-z0-9]+(\.[a-z0-9-]+)*$/,
    },
    type: {
      type: String,
      enum: CONTENT_TYPES,
      required: true,
      default: 'section',
      index: true,
    },
    content: {
      type: {
        pt: { type: Schema.Types.Mixed, required: true },
        en: { type: Schema.Types.Mixed },
      },
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    helperText: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    active: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false, // grava objetos vazios — útil para conteúdo flexível
  },
);

// ============================================================
// Indexes
// ============================================================

// key já é unique (cria index automaticamente)
siteContentSchema.index({ active: 1, type: 1 });

// ============================================================
// Helpers — facilitar leitura no frontend
// ============================================================

/**
 * Obtém conteúdo por key, com fallback opcional.
 *
 * @example
 * const hero = await getSiteContent("home.hero");
 * const title = hero?.content.pt.title ?? "Texto por defeito";
 */
export async function getSiteContent(key: string): Promise<ISiteContent | null> {
  return SiteContent.findOne({ key, active: true }).lean();
}

/**
 * Obtém múltiplos contents de uma vez (otimização).
 *
 * @example
 * const contents = await getSiteContents(["home.hero", "home.philosophy"]);
 * const map = Object.fromEntries(contents.map(c => [c.key, c]));
 * map["home.hero"].content.pt.title;
 */
export async function getSiteContents(keys: string[]): Promise<ISiteContent[]> {
  return SiteContent.find({ key: { $in: keys }, active: true }).lean();
}

// ============================================================
// Model singleton
// ============================================================

export const SiteContent: Model<ISiteContent> =
  models.SiteContent || model<ISiteContent>('SiteContent', siteContentSchema);
