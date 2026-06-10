import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { exportJsonReport, openPrintableReport } from '../utils/exportReport.js';

export default function ExportReportBar({ userId, onToast }) {
  const [exporting, setExporting] = useState(false);

  const handleJson = async () => {
    if (!userId) return;
    setExporting(true);
    try {
      await exportJsonReport(userId);
      onToast?.('JSON report downloaded', 'success');
    } catch (e) {
      onToast?.(e.message || 'Export failed', 'danger');
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = () => {
    if (!userId) return;
    openPrintableReport(userId);
    onToast?.('Report opened — use Print → Save as PDF', 'success');
  };

  return (
    <motion.div
      className="export-report-bar glass-card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="export-report-info">
        <Lucide.FileBarChart size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div>
          <h3>Export Wellness Report</h3>
          <p>Download your analytics, journal, memory, and chat insights for presentations or records.</p>
        </div>
      </div>
      <div className="export-report-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleJson}
          disabled={exporting}
        >
          <Lucide.Download size={16} />
          {exporting ? 'Exporting…' : 'JSON'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handlePdf} disabled={exporting}>
          <Lucide.FileText size={16} /> PDF Report
        </button>
      </div>
    </motion.div>
  );
}
