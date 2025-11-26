"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Save, X, RefreshCw, User, Check, Edit3, Clock, CheckCircle, ChevronLeft, ChevronRight, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";

interface Feedback {
  type: "success" | "error";
  message: string;
}

interface ModalData {
  row: string[];
  absoluteIndex: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status", icon: null },
  { value: "pendente", label: "Pendente", icon: <Clock className="w-4 h-4 text-yellow-600" /> },
  { value: "atendido", label: "Atendido", icon: <CheckCircle className="w-4 h-4 text-green-600" /> }
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function Dashboard() {
  const [rows, setRows] = useState<string[][]>([]);
  const [snapshot, setSnapshot] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [modalFormData, setModalFormData] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('Dashboard: No user found, redirecting to login');
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://sheetsapi-4glvqxtnkq-uc.a.run.app/sheets");
      const data = await res.json();
      const values = data.values || [];
      setRows(values);
      setSnapshot(values);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setFeedback({ type: "error", message: "❌ Erro ao carregar dados" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (user) {
      loadData(); 
    }
  }, [loadData, user]);

  const headers = rows[0] ?? [];

  // Utility functions
  const getColumnIndex = useCallback((keywords: string[]) =>
    headers.findIndex(header =>
      keywords.some(keyword => header.toLowerCase().includes(keyword))
    ), [headers]);

  const statusColumnIndex = useMemo(() => getColumnIndex(['status', 'situação', 'retorno']), [getColumnIndex]);
  const lastContactColumnIndex = useMemo(() => getColumnIndex(['contato', 'ultimo', 'último', 'last contact', 'data contato']), [getColumnIndex]);
  const cpfColumnIndex = useMemo(() => getColumnIndex(['cpf']), [getColumnIndex]);

  const getCurrentStatus = useCallback((row: string[]) => {
    if (statusColumnIndex === -1 || !row[statusColumnIndex]) return 'Pendente';
    return row[statusColumnIndex];
  }, [statusColumnIndex]);

  const isStatusAtendido = useCallback((status: string) => status.toLowerCase().includes('atendido') || status.toLowerCase() === 'atendido', []);

  // Data processing
  const allEntries = useMemo(() =>
    rows.map((row, index) => ({ row, absoluteIndex: index }))
      .filter(({ absoluteIndex }) => absoluteIndex !== 0), [rows]);

  const parseDate = useCallback((dateString: string): number => {
    if (!dateString) return 0;

    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/,
      /^(\d{2})(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/,
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    ];

    for (const pattern of formats) {
      const match = dateString.match(pattern);
      if (match) {
        const [, day, month, year, hours = '00', minutes = '00'] = match;
        return new Date(`${year}-${month}-${day}T${hours}:${minutes}`).getTime();
      }
    }

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }, []);

  const getLastContactDate = useCallback((row: string[]) => lastContactColumnIndex !== -1 ? row[lastContactColumnIndex] || '' : '', [lastContactColumnIndex]);

  const sortedEntries = useMemo(() =>
    [...allEntries].sort((a, b) =>
      parseDate(getLastContactDate(b.row)) - parseDate(getLastContactDate(a.row))
    ), [allEntries, parseDate, getLastContactDate]);

  const filteredEntries = useMemo(() => {
    let filtered = sortedEntries;

    if (searchTerm) {
      filtered = filtered.filter(({ row }) =>
        row.some(cell => cell?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(({ row }) => {
        const status = getCurrentStatus(row);
        return statusFilter === "atendido" ? isStatusAtendido(status) : !isStatusAtendido(status);
      });
    }

    return filtered;
  }, [sortedEntries, searchTerm, statusFilter, getCurrentStatus, isStatusAtendido]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Formatting functions
  const formatPhone = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "—";
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    return digits.length === 11 ?
      `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` :
      raw || "—";
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "—";

    const match = dateString.match(/^(\d{2})(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dateString)) return dateString;

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString :
      `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatValue = (label: string, value: string) => {
    if (!value) return "—";

    const normalizedLabel = label.toLowerCase();
    if (normalizedLabel.includes("telefone")) return formatPhone(value);
    if (normalizedLabel.includes("cpf")) return formatCpf(value);
    if (lastContactColumnIndex !== -1 && headers.indexOf(label) === lastContactColumnIndex) {
      return formatDateForDisplay(value);
    }

    return value;
  };

  const getInputType = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes("email")) return "email";
    if (normalized.includes("telefone")) return "tel";
    return "text";
  };

  // Actions
  const toggleStatus = async (absoluteIndex: number) => {
    if (statusColumnIndex === -1) return;

    const currentStatus = getCurrentStatus(rows[absoluteIndex]);
    const newStatus = isStatusAtendido(currentStatus) ? 'Pendente' : 'Atendido';

    setSavingRow(absoluteIndex);
    setFeedback(null);

    try {
      const updatedRow = [...rows[absoluteIndex]];
      updatedRow[statusColumnIndex] = newStatus;

      const res = await fetch("https://sheetsapi-4glvqxtnkq-uc.a.run.app/sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: absoluteIndex + 1, values: updatedRow }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");

      setRows(prev => prev.map((row, idx) => idx === absoluteIndex ? updatedRow : row));
      setSnapshot(prev => prev.map((row, idx) => idx === absoluteIndex ? updatedRow : row));

      setFeedback({ type: "success", message: "Status atualizado com sucesso!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Erro ao atualizar status" });
    } finally {
      setSavingRow(null);
    }
  };

  async function handleLogout() {
    try {
      setLogoutOpen(false);
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setFeedback({
        type: "error",
        message: "Erro ao fazer logout"
      });
    }
  }

  // Modal functions
  const openEditModal = (rowData: ModalData) => {
    setModalData(rowData);
    setModalFormData([...rowData.row]);
  };

  const closeEditModal = () => {
    setModalData(null);
    setModalFormData([]);
  };

  const handleModalFieldChange = (columnIndex: number, value: string) => {
    setModalFormData(prev => {
      const newData = [...prev];
      newData[columnIndex] = value;
      return newData;
    });
  };

  const hasChangesInModal = () => modalData && JSON.stringify(snapshot[modalData.absoluteIndex]) !== JSON.stringify(modalFormData);

  const saveRow = async () => {
    if (!modalData) return;

    setSavingRow(modalData.absoluteIndex);
    setFeedback(null);

    try {
      const res = await fetch("https://sheetsapi-4glvqxtnkq-uc.a.run.app/sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: modalData.absoluteIndex + 1, values: modalFormData }),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      setRows(prev => prev.map((row, idx) => idx === modalData.absoluteIndex ? [...modalFormData] : row));
      setSnapshot(prev => prev.map((row, idx) => idx === modalData.absoluteIndex ? [...modalFormData] : row));

      setFeedback({ type: "success", message: "Registro atualizado com sucesso!" });
      setTimeout(() => setFeedback(null), 3000);
      closeEditModal();
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Erro ao salvar. Tente novamente." });
    } finally {
      setSavingRow(null);
    }
  };

  // Table configuration
  const displayHeaders = useMemo(() => {
    const mainHeaders = headers
      .filter((header, index) => index !== statusColumnIndex && index !== cpfColumnIndex)
      .slice(0, 3);

    if (lastContactColumnIndex !== -1 && !mainHeaders.includes(headers[lastContactColumnIndex])) {
      mainHeaders.push(headers[lastContactColumnIndex]);
    }

    return mainHeaders;
  }, [headers, statusColumnIndex, cpfColumnIndex, lastContactColumnIndex]);

  const getStatusOption = (value: string) => STATUS_OPTIONS.find(option => option.value === value) || STATUS_OPTIONS[0];

  // Components
  const LogoutModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-in zoom-in-95 duration-300 border border-gray-200">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sair do Sistema</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setLogoutOpen(false)}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium text-sm border border-gray-300 hover:border-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  const FeedbackToast = () => feedback && (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-right duration-300 shadow-lg ${
      feedback.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
    }`}>
      {feedback.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="text-sm font-medium">{feedback.message}</span>
    </div>
  );

  const StatsCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${color} rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const Pagination = () => totalPages > 1 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-300 p-6 shadow-sm">
      <div className="text-sm text-gray-700">
        Página {currentPage} de {totalPages} • {currentEntries.length} de {filteredEntries.length} itens
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPages > 5) {
            if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
          }
          return (
            <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
              className={`w-10 h-10 rounded-lg border transition-all duration-200 ${
                currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:shadow-sm'
              }`}>
              {pageNum}
            </button>
          );
        })}
        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">
            {authLoading ? 'Verificando autenticação...' : 'Redirecionando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {logoutOpen && <LogoutModal />}
      <FeedbackToast />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sistema de Pacientes
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Gerencie e acompanhe os dados dos pacientes</p>
          <button onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mt-4 mx-auto">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        {/* Resto do seu JSX permanece igual */}
        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Buscar pacientes..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 transition-all duration-200" />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <button onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-900 shadow-sm min-w-[180px] justify-between">
                <div className="flex items-center gap-2">
                  {getStatusOption(statusFilter).icon}
                  <span className="font-medium">{getStatusOption(statusFilter).label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <button key={option.value} onClick={() => { setStatusFilter(option.value); setCurrentPage(1); setIsStatusDropdownOpen(false); }}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        statusFilter === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      } ${option.value === 'all' ? 'border-b border-gray-200' : ''}`}>
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm font-medium">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard icon={<User className="w-5 h-5 text-blue-600" />} label="Total de Pacientes"
            value={filteredEntries.length} color="bg-blue-100" />
          <StatsCard icon={<Clock className="w-5 h-5 text-yellow-600" />} label="Pendentes"
            value={filteredEntries.filter(({ row }) => !isStatusAtendido(getCurrentStatus(row))).length} color="bg-yellow-100" />
          <StatsCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} label="Atendidos"
            value={filteredEntries.filter(({ row }) => isStatusAtendido(getCurrentStatus(row))).length} color="bg-green-100" />
        </div>

        {/* Items per page */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Itens por página:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ITEMS_PER_PAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-700">
            Página {currentPage} de {totalPages} • {currentEntries.length} de {filteredEntries.length} itens
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-300 p-12 text-center shadow-sm">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 text-lg">Carregando pacientes...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-300 p-12 text-center shadow-sm">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 text-lg mb-2">
              {searchTerm || statusFilter !== "all" ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-300 overflow-hidden mb-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gradient-to-r from-gray-50 to-blue-50">
                      {displayHeaders.map((header, index) => (
                        <th key={index} className="px-6 py-4 text-left text-sm font-semibold text-gray-800 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-800 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {currentEntries.map(({ row, absoluteIndex }) => {
                      const currentStatus = getCurrentStatus(row);
                      const isAtendido = isStatusAtendido(currentStatus);

                      return (
                        <tr key={absoluteIndex} className="hover:bg-blue-50 transition-colors group">
                          {displayHeaders.map((header, columnIndex) => {
                            const originalIndex = headers.indexOf(header);
                            return (
                              <td key={columnIndex} className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-medium">
                                  {formatValue(header, row[originalIndex] || "")}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button onClick={() => toggleStatus(absoluteIndex)} disabled={savingRow === absoluteIndex}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                                isAtendido ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' :
                                'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200'
                              } ${savingRow === absoluteIndex ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} shadow-sm`}>
                              {isAtendido ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              {savingRow === absoluteIndex ? 'Salvando...' : currentStatus}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => openEditModal({ row, absoluteIndex })}
                              className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-100 transition-all duration-200 font-semibold group-hover:bg-blue-100">
                              <Edit3 className="w-4 h-4 inline mr-2" /> Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination />
          </>
        )}

        {/* Edit Modal */}
        {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="px-6 py-4 border-b border-gray-300 bg-gradient-to-r from-gray-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Editar Paciente</h3>
                  <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-200 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {headers.map((label, columnIndex) => (
                    <div key={columnIndex} className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">{label}</label>
                      {columnIndex === statusColumnIndex ? (
                        <div className="relative">
                          <select value={modalFormData[columnIndex] || 'Pendente'}
                            onChange={(e) => handleModalFieldChange(columnIndex, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white transition-all duration-200 appearance-none">
                            <option value="Pendente">Pendente</option>
                            <option value="Atendido">Atendido</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      ) : (
                        <input type={getInputType(label)} value={modalFormData[columnIndex] || ''}
                          onChange={(e) => handleModalFieldChange(columnIndex, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white transition-all duration-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-300 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button onClick={closeEditModal}
                    className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm">
                    Cancelar
                  </button>
                  <button onClick={saveRow} disabled={savingRow === modalData.absoluteIndex}
                    className={`px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium shadow-sm ${
                      savingRow === modalData.absoluteIndex ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                    }`}>
                    {savingRow === modalData.absoluteIndex ? (
                      <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Salvando...</div>
                    ) : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}