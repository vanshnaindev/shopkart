import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const { showToast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/reports?range=${timeRange}`);
      if (data.success) {
        setReports(data.reports);
      }
    } catch (err: any) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${filename} successfully!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Business Intelligence &amp; Reports
          </h1>
          <p className="text-xs text-gray-500">
            Export comprehensive sales, order fulfillment, and product performance analytics as CSV
            files.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 p-1 rounded-lg text-xs font-bold">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded capitalize transition cursor-pointer ${
                timeRange === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {reports && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Net Sales
            </span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              ₹{reports.totalSales?.toLocaleString('en-IN') || 0}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              Excludes cancelled returns
            </span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Orders Processed
            </span>
            <div className="text-2xl font-black text-gray-900 mt-1">{reports.totalOrders || 0}</div>
            <span className="text-[11px] text-blue-600 font-semibold">
              Across all delivery hubs
            </span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Active Customer Base
            </span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {reports.totalCustomers || 0}
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold">
              Verified account holders
            </span>
          </div>
        </div>
      )}

      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders CSV Export */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-base">Orders &amp; Financials Export</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Export all customer orders including Order ID, Customer Name, Email, Payment Method,
              Order Status, and Total Rupee Amounts.
            </p>
          </div>
          <button
            onClick={() =>
              reports?.ordersCsv &&
              downloadCsv(reports.ordersCsv, `ShopKart_Orders_${Date.now()}.csv`)
            }
            disabled={!reports?.ordersCsv}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Orders CSV
          </button>
        </div>

        {/* Products CSV Export */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-base">
                Product Inventory &amp; Catalog Export
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Export all catalog products with SKU numbers, brand labels, pricing, remaining stock
              levels, and customer ratings.
            </p>
          </div>
          <button
            onClick={() =>
              reports?.productsCsv &&
              downloadCsv(reports.productsCsv, `ShopKart_Products_${Date.now()}.csv`)
            }
            disabled={!reports?.productsCsv}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Products CSV
          </button>
        </div>
      </div>
    </div>
  );
};
