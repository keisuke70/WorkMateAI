// src/index.ts
import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { GoogleHandler } from './google-handler'

// ============================================================
// 1.  Types
// ============================================================

export type Env = {
  DB: D1Database
  ROLES: KVNamespace
}

type Props = {
  name: string
  email: string
  accessToken: string
}

export function requirePermission(permission: string, handler: (args: any, extra: any) => any) {
  const want = permission.trim().toLowerCase()

  return async function (this: any, args: any, extra: any) {
    // Runtime-safe lookup: fall back to [] if missing
    const perms: string[] = (this.props?.permissions ?? []).map((p: string) => p.trim().toLowerCase())

    if (!perms.includes(want)) {
      return {
        status: 403,
        content: [{ type: 'text', text: `Permission denied – need ${permission}` }],
      }
    }
    // keep env / props by calling through with the same `this`
    return handler.call(this, args, extra)
  }
}

// ============================================================
// 2.  MCP Agent
// ============================================================

export class MyMCP extends McpAgent<Props, Env> {
 
  server = new McpServer({
    name: 'Factory-Floor Log MCP',
    version: '0.1.0',
  })

  async init() {
    // debugging kv permissions
    this.server.tool(
      'whoAmI',
      'Debug: show auth context',
      {},
      (async () => ({
        content: [{ type: 'text', text: JSON.stringify(this.props, null, 2) }],
      })).bind(this),
    )

    // ------------------------------------------------------------------
    // Daily Reports
    // ------------------------------------------------------------------
    this.server.tool(
      'queryDailyReports',
      'Return daily reports (optionally filtered by date or employeeId).',
      { date: z.string().optional(), employeeId: z.number().optional() },
      requirePermission('read_daily', async (args) => {
        const db = this.env.DB
        const { date, employeeId } = args

        let sql = 'SELECT * FROM daily_reports'
        const params: unknown[] = []

        if (date || employeeId) {
          sql += ' WHERE'
          if (date) {
            sql += ' report_date = ?'
            params.push(date)
          }
          if (date && employeeId) sql += ' AND'
          if (employeeId) {
            sql += ' employee_id = ?'
            params.push(employeeId)
          }
        }
        sql += ' ORDER BY report_date DESC LIMIT 50'

        const res = await db
          .prepare(sql)
          .bind(...params)
          .all()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.results, null, 2),
            },
          ],
        }
      }).bind(this),
    )

    this.server.tool(
      'insertDailyReport',
      'Create a new daily report.',
      {
        reportDate: z.string(),
        employeeId: z.number(),
        workPlan: z.string(),
        workResult: z.string(),
        issues: z.string(),
        nextPlan: z.string(),
      },
      requirePermission('write_daily', async (args) => {
        const db = this.env.DB
        await db
          .prepare(
            `INSERT INTO daily_reports
         (report_date, employee_id, work_plan, work_result, issues, next_plan)
         VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(args.reportDate, args.employeeId, args.workPlan, args.workResult, args.issues, args.nextPlan)
          .run()

        return {
          content: [{ type: 'text', text: '✅ Daily report inserted' }],
        }
      }).bind(this),
    )

    // ------------------------------------------------------------------
    // Inspection Logs
    // ------------------------------------------------------------------
    this.server.tool(
      'queryInspectionLogs',
      'List inspections (optionally filtered by equipmentId or date).',
      { equipmentId: z.number().optional(), date: z.string().optional() },
      requirePermission('read_daily', async (args) => {
        const db = this.env.DB
        const { equipmentId, date } = args

        let sql = 'SELECT * FROM inspection_logs'
        const params: unknown[] = []

        if (equipmentId || date) {
          sql += ' WHERE'
          if (equipmentId) {
            sql += ' equipment_id = ?'
            params.push(equipmentId)
          }
          if (equipmentId && date) sql += ' AND'
          if (date) {
            sql += ' inspect_date = ?'
            params.push(date)
          }
        }
        sql += ' ORDER BY inspect_date DESC LIMIT 50'

        const res = await db
          .prepare(sql)
          .bind(...params)
          .all()
        return {
          content: [{ type: 'text', text: JSON.stringify(res.results, null, 2) }],
        }
      }).bind(this),
    )

    this.server.tool(
      'insertInspectionLog',
      'Add an inspection record.',
      {
        equipmentId: z.number(),
        inspectBy: z.number(),
        result: z.string(),
        notes: z.string(),
        nextSchedule: z.string(),
        inspectDate: z.string(),
      },
      requirePermission('write_daily', async function (args) {
        const db = this.env.DB
        await db
          .prepare(
            `INSERT INTO inspection_logs
           (equipment_id, inspect_date, inspect_by, result, notes, next_schedule)
           VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(args.equipmentId, args.inspectDate, args.inspectBy, args.result, args.notes, args.nextSchedule)
          .run()
        return {
          content: [{ type: 'text', text: '✅ Inspection log inserted' }],
        }
      }).bind(this),
    )

    // ------------------------------------------------------------------
    // Anomaly Reports
    // ------------------------------------------------------------------
    this.server.tool(
      'queryAnomalyReports',
      'Fetch anomalies (optionally filtered by equipmentId or since date).',
      { equipmentId: z.number().optional(), since: z.string().optional() },
      requirePermission('read_daily', async (args) => {
        const db = this.env.DB
        const { equipmentId, since } = args

        let sql = 'SELECT * FROM anomaly_reports'
        const params: unknown[] = []

        if (equipmentId || since) {
          sql += ' WHERE'
          if (equipmentId) {
            sql += ' equipment_id = ?'
            params.push(equipmentId)
          }
          if (equipmentId && since) sql += ' AND'
          if (since) {
            sql += ' occurred_at >= ?'
            params.push(since)
          }
        }
        sql += ' ORDER BY occurred_at DESC LIMIT 50'

        const res = await db
          .prepare(sql)
          .bind(...params)
          .all()
        return {
          content: [{ type: 'text', text: JSON.stringify(res.results, null, 2) }],
        }
      }).bind(this),
    )

    this.server.tool(
      'insertAnomalyReport',
      'Log a new anomaly.',
      {
        equipmentId: z.number(),
        reportedBy: z.number(),
        title: z.string(),
        description: z.string(),
      },
      requirePermission('write_daily', async function (args, _extra) {
        const db = this.env.DB
        await db
          .prepare(
            `INSERT INTO anomaly_reports
           (equipment_id, occurred_at, reported_by, title, description)
           VALUES (?, datetime('now'), ?, ?, ?)`,
          )
          .bind(args.equipmentId, args.reportedBy, args.title, args.description)
          .run()

        return {
          content: [{ type: 'text', text: '✅ Anomaly report inserted' }],
        }
      }).bind(this),
    )
  }
}

// ============================================================
// 3.  Worker entry (OAuthProvider)
// ============================================================

export default new OAuthProvider({
  apiRoute: '/sse',
  apiHandler: MyMCP.serveSSE('/sse'),
  defaultHandler: GoogleHandler,

  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
