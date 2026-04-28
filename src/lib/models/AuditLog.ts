import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'refund'
  | 'issue'
  | 'retry'
  | 'login'
  | 'logout'
  | 'access'
  | 'permission-change'
  | 'open'
  | 'close'
  | 'reopen';

export const AUDIT_ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'cancel',
  'refund',
  'issue',
  'retry',
  'login',
  'logout',
  'access',
  'permission-change',
  'open',
  'close',
  'reopen',
];

export type AuditResource =
  | 'transaction'
  | 'invoice'
  | 'client'
  | 'booking'
  | 'service'
  | 'staff'
  | 'user'
  | 'cash-register'
  | 'fiscal-settings'
  | 'schedule'
  | 'site-content';

export const AUDIT_RESOURCES: AuditResource[] = [
  'transaction',
  'invoice',
  'client',
  'booking',
  'service',
  'staff',
  'user',
  'cash-register',
  'fiscal-settings',
  'schedule',
  'site-content',
];

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceLabel?: string;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  changes?: AuditChanges;
  message: string;
  severity: AuditSeverity;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const auditChangesSchema = new Schema<AuditChanges>(
  {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      enum: AUDIT_RESOURCES,
      required: true,
      index: true,
    },
    resourceId: { type: String, sparse: true },
    resourceLabel: { type: String, trim: true, maxlength: 100 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    userName: { type: String, trim: true, maxlength: 120 },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    userRole: { type: String, trim: true, maxlength: 30 },
    changes: auditChangesSchema,
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    ip: { type: String, trim: true, maxlength: 50 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

// ============================================================
// Indexes
// ============================================================

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, resource: 1, timestamp: -1 });

auditLogSchema.index(
  { severity: 1, timestamp: -1 },
  { partialFilterExpression: { severity: 'critical' } },
);

// ============================================================
// IMUTABILIDADE
// ============================================================

/**
 * Bloqueia UPDATE de logs já criados via document.save().
 * Audit logs são append-only por design.
 *
 * Nota: As query-level middlewares (updateOne, deleteOne, etc.) não são
 * tipadas corretamente no Mongoose 9. A imutabilidade total é garantida a
 * 2 níveis adicionais:
 *   1. Não criamos endpoints/server actions de UPDATE ou DELETE para AuditLog
 *   2. Permissões a nível de aplicação (apenas server-side, nunca exposto)
 */
auditLogSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('AuditLog é imutável — não pode ser editado');
  }
});

// ============================================================
// Helpers
// ============================================================

/**
 * Cria uma entry de audit log.
 * Falhas silenciosas (não bloqueiam a operação principal).
 */
export async function logAudit(
  entry: Omit<IAuditLog, '_id' | 'timestamp'> & { timestamp?: Date },
): Promise<void> {
  try {
    await AuditLog.create({
      ...entry,
      timestamp: entry.timestamp ?? new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Falha ao gravar entry:', err);
  }
}

// ============================================================
// Model singleton
// ============================================================

export const AuditLog: Model<IAuditLog> =
  models.AuditLog || model<IAuditLog>('AuditLog', auditLogSchema);
