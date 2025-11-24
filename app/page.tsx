"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Save, X, RefreshCw, User, Check, Mail, Phone, Calendar, FileText, Edit3, Clock, CheckCircle, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export default function Home() {
  const [rows, setRows] = useState<string[][]>([]);
  const [snapshot, setSnapshot] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [modalData, setModalData] = useState<{row: string[], absoluteIndex: number} | null>(null);
  const [modalFormData, setModalFormData] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets");
      const data = await res.json();
      const values = data.values || [];
      setRows(values);
      setSnapshot(values);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setFeedback({
        type: "error",
        message: "❌ Erro ao carregar dados",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const headers = rows[0] ?? [];
  const allEntries = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, absoluteIndex: index }))
        .filter(({ absoluteIndex }) => absoluteIndex !== 0),
    [rows],
  );

  // Função para encontrar o índice da coluna de status
  const getStatusColumnIndex = () => {
    return headers.findIndex(header => 
      header.toLowerCase().includes('status') || 
      header.toLowerCase().includes('situação') ||
      header.toLowerCase().includes('retorno')
    );
  };

  // Função para encontrar o índice da coluna de data do último contato
  const getLastContactDateColumnIndex = () => {
    return headers.findIndex(header => 
      header.toLowerCase().includes('contato') ||
      header.toLowerCase().includes('ultimo') ||
      header.toLowerCase().includes('último') ||
      header.toLowerCase().includes('last contact') ||
      header.toLowerCase().includes('data contato')
    );
  };

  // Função para encontrar o índice da coluna CPF
  const getCpfColumnIndex = () => {
    return headers.findIndex(header => 
      header.toLowerCase().includes('cpf')
    );
  };

  // Função para obter o status atual de uma linha
  const getCurrentStatus = (row: string[]) => {
    const statusIndex = getStatusColumnIndex();
    if (statusIndex === -1 || !row[statusIndex]) return 'Pendente';
    return row[statusIndex];
  };

  // Função para obter a data do último contato de uma linha
  const getLastContactDate = (row: string[]) => {
    const lastContactIndex = getLastContactDateColumnIndex();
    if (lastContactIndex === -1 || !row[lastContactIndex]) return '';
    return row[lastContactIndex];
  };

  // Função para verificar se o status é "Atendido"
  const isStatusAtendido = (status: string) => {
    return status.toLowerCase().includes('atendido') || status.toLowerCase() === 'atendido';
  };

  // Função para converter data para timestamp para ordenação
  const parseDate = (dateString: string): number => {
    if (!dateString) return 0;
    
    // Tenta converter do formato DD/MM/YYYY HH:mm
    const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      return new Date(`${year}-${month}-${day}T${hours}:${minutes}`).getTime();
    }
    
    // Tenta converter do formato DDMM/AAAA HH:mm (do exemplo fornecido)
    const match2 = dateString.match(/^(\d{2})(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match2) {
      const [, day, month, year, hours, minutes] = match2;
      return new Date(`${year}-${month}-${day}T${hours}:${minutes}`).getTime();
    }
    
    // Tenta converter apenas data (sem horário)
    const dateMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      return new Date(`${year}-${month}-${day}`).getTime();
    }
    
    // Tenta converter de outros formatos
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  // Ordena as entradas por data do último contato (mais recente primeiro)
  const sortedEntries = useMemo(() => {
    return [...allEntries].sort((a, b) => {
      const dateA = parseDate(getLastContactDate(a.row));
      const dateB = parseDate(getLastContactDate(b.row));
      return dateB - dateA; // Mais recente primeiro
    });
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    let filtered = sortedEntries;

    // Filtro por busca textual
    if (searchTerm) {
      filtered = filtered.filter(({ row }) =>
        row.some((cell) =>
          cell?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(({ row }) => {
        const status = getCurrentStatus(row);
        if (statusFilter === "atendido") {
          return isStatusAtendido(status);
        } else {
          return !isStatusAtendido(status);
        }
      });
    }

    return filtered;
  }, [sortedEntries, searchTerm, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  function formatPhone(raw: string) {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "—";
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }

  function formatCpf(raw: string) {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length !== 11) return raw || "—";
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  // Função para formatar data do último contato para exibição (com horário)
  function formatLastContactDateForDisplay(dateString: string) {
    if (!dateString) return "—";
    
    // Se já está no formato DD/MM/YYYY HH:mm, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Se está no formato DDMM/AAAA HH:mm (do exemplo), converte
    const match = dateString.match(/^(\d{2})(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    // Tenta converter de outros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearFull = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${yearFull} ${hours}:${minutes}`;
  }

  function formatValue(label: string, value: string) {
    if (!value) return "—";
    if (label.toLowerCase().includes("telefone")) return formatPhone(value);
    if (label.toLowerCase().includes("cpf")) return formatCpf(value);
    
    // Formata data do último contato (com horário)
    const lastContactIndex = getLastContactDateColumnIndex();
    const currentIndex = headers.indexOf(label);
    if (lastContactIndex !== -1 && currentIndex === lastContactIndex) {
      return formatLastContactDateForDisplay(value) || value;
    }
    
    return value;
  }

  // Função para formatar data para input no modal
  function formatDateForInput(dateString: string) {
    if (!dateString) return '';
    
    // Para último contato, mantém data e horário
    // Se já está no formato DD/MM/YYYY HH:mm, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Se está no formato DDMM/AAAA HH:mm (do exemplo), converte
    const match = dateString.match(/^(\d{2})(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    // Tenta converter de outros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearFull = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${yearFull} ${hours}:${minutes}`;
  }

  function getInputType(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes("email")) return "email";
    if (normalized.includes("telefone")) return "tel";
    return "text";
  }

  // Função para alternar o status
  const toggleStatus = async (absoluteIndex: number) => {
    const statusIndex = getStatusColumnIndex();
    if (statusIndex === -1) return;

    const currentStatus = getCurrentStatus(rows[absoluteIndex]);
    const newStatus = isStatusAtendido(currentStatus) ? 'Pendente' : 'Atendido';

    setSavingRow(absoluteIndex);
    setFeedback(null);

    try {
      const updatedRow = [...rows[absoluteIndex]];
      updatedRow[statusIndex] = newStatus;

      const res = await fetch("/api/sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: absoluteIndex + 1,
          values: updatedRow,
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");

      setRows(prev => {
        const newRows = [...prev];
        newRows[absoluteIndex] = updatedRow;
        return newRows;
      });

      setSnapshot(prev => {
        const newSnapshot = [...prev];
        newSnapshot[absoluteIndex] = updatedRow;
        return newSnapshot;
      });

      setFeedback({
        type: "success",
        message: "Status atualizado com sucesso!",
      });
      
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Erro ao atualizar status",
      });
    } finally {
      setSavingRow(null);
    }
  };

  function openEditModal(rowData: {row: string[], absoluteIndex: number}) {
    setModalData(rowData);
    
    // Prepara os dados para o modal, formatando datas corretamente
    const formattedData = [...rowData.row];
    const lastContactIndex = getLastContactDateColumnIndex();
    
    // Formata data do último contato (com horário)
    if (lastContactIndex !== -1 && formattedData[lastContactIndex]) {
      const formattedDate = formatDateForInput(formattedData[lastContactIndex]);
      if (formattedDate) {
        formattedData[lastContactIndex] = formattedDate;
      }
    }
    
    setModalFormData(formattedData);
  }

  function closeEditModal() {
    setModalData(null);
    setModalFormData([]);
  }

  function handleModalFieldChange(columnIndex: number, value: string) {
    setModalFormData(prev => {
      const newData = [...prev];
      newData[columnIndex] = value;
      return newData;
    });
  }

  function handleResetModal() {
    if (!modalData) return;
    const originalData = [...snapshot[modalData.absoluteIndex]];
    
    // Formata a data do último contato
    const lastContactIndex = getLastContactDateColumnIndex();
    if (lastContactIndex !== -1 && originalData[lastContactIndex]) {
      const formattedDate = formatDateForInput(originalData[lastContactIndex]);
      if (formattedDate) {
        originalData[lastContactIndex] = formattedDate;
      }
    }
    
    setModalFormData(originalData);
  }

  const hasChangesInModal = () => {
    if (!modalData) return false;
    return JSON.stringify(snapshot[modalData.absoluteIndex]) !== JSON.stringify(modalFormData);
  };

  async function saveRow() {
    if (!modalData) return;
    
    setSavingRow(modalData.absoluteIndex);
    setFeedback(null);

    try {
      const res = await fetch("/api/sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: modalData.absoluteIndex + 1,
          values: modalFormData,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      setRows(prev => {
        const newRows = [...prev];
        newRows[modalData.absoluteIndex] = [...modalFormData];
        return newRows;
      });

      setSnapshot(prev => {
        const newSnapshot = [...prev];
        newSnapshot[modalData.absoluteIndex] = [...modalFormData];
        return newSnapshot;
      });

      setFeedback({
        type: "success",
        message: "Registro atualizado com sucesso!",
      });
      
      setTimeout(() => setFeedback(null), 3000);
      closeEditModal();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Erro ao salvar. Tente novamente.",
      });
    } finally {
      setSavingRow(null);
    }
  }

  const statusColumnIndex = getStatusColumnIndex();
  const lastContactColumnIndex = getLastContactDateColumnIndex();
  const cpfColumnIndex = getCpfColumnIndex();
  
  // Headers para exibição - substitui CPF pela data do último contato
  const displayHeaders = headers
    .filter((header, index) => {
      // Remove colunas de status
      if (index === statusColumnIndex) return false;
      
      // Remove coluna CPF (será substituída pela data do último contato)
      if (index === cpfColumnIndex) return false;
      
      return true;
    })
    .slice(0, 3); // Mostra até 3 colunas principais

  // Adiciona a data do último contato no lugar do CPF
  if (lastContactColumnIndex !== -1 && !displayHeaders.includes(headers[lastContactColumnIndex])) {
    displayHeaders.push(headers[lastContactColumnIndex]);
  }

  // Status options para o dropdown
  const statusOptions = [
    { value: "all", label: "Todos os status", icon: null },
    { value: "pendente", label: "Pendente", icon: <Clock className="w-4 h-4 text-yellow-600" /> },
    { value: "atendido", label: "Atendido", icon: <CheckCircle className="w-4 h-4 text-green-600" /> }
  ];

  const getStatusOption = (value: string) => {
    return statusOptions.find(option => option.value === value) || statusOptions[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sistema de Pacientes
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Gerencie e acompanhe os dados dos pacientes</p>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all duration-200"
            />
          </div>
          
          <div className="flex gap-3">
            {/* Dropdown de Status Melhorado */}
            <div className="relative">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-900 shadow-sm min-w-[180px] justify-between"
              >
                <div className="flex items-center gap-2">
                  {getStatusOption(statusFilter).icon}
                  <span className="font-medium">{getStatusOption(statusFilter).label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value);
                        setCurrentPage(1);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        statusFilter === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      } ${option.value === 'all' ? 'border-b border-gray-200' : ''}`}
                    >
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Pacientes</p>
                <p className="text-xl font-bold text-gray-900">{filteredEntries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredEntries.filter(({ row }) => !isStatusAtendido(getCurrentStatus(row))).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Atendidos</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredEntries.filter(({ row }) => isStatusAtendido(getCurrentStatus(row))).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Itens por página */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Itens por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-700">
            Página {currentPage} de {totalPages} • {currentEntries.length} de {filteredEntries.length} itens
          </div>
        </div>

        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-right duration-300 shadow-lg ${
              feedback.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

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
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
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
                        <th 
                          key={index}
                          className="px-6 py-4 text-left text-sm font-semibold text-gray-800 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-800 uppercase tracking-wider">
                        Ações
                      </th>
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
                            <button
                              onClick={() => toggleStatus(absoluteIndex)}
                              disabled={savingRow === absoluteIndex}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                                isAtendido
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 shadow-sm'
                                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200 shadow-sm'
                              } ${savingRow === absoluteIndex ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                            >
                              {isAtendido ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                              {savingRow === absoluteIndex ? 'Salvando...' : currentStatus}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal({ row, absoluteIndex })}
                              className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-100 transition-all duration-200 font-semibold group-hover:bg-blue-100"
                            >
                              <Edit3 className="w-4 h-4 inline mr-2" />
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-300 p-6 shadow-sm">
                <div className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages} • {currentEntries.length} de {filteredEntries.length} itens
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg border transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:shadow-sm'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Modal */}
        {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-300 bg-gradient-to-r from-gray-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Editar Paciente</h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {headers.map((label, columnIndex) => {
                    const isLastContact = columnIndex === lastContactColumnIndex;
                    const isStatusColumn = columnIndex === statusColumnIndex;
                    
                    return (
                      <div key={columnIndex} className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-800">
                          {label}
                        </label>
                        {isStatusColumn ? (
                          <div className="relative">
                            <select
                              value={modalFormData[columnIndex] || 'Pendente'}
                              onChange={(e) => handleModalFieldChange(columnIndex, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white transition-all duration-200 appearance-none"
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Atendido">Atendido</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          </div>
                        ) : isLastContact ? (
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY HH:mm"
                            value={modalFormData[columnIndex] || ''}
                            onChange={(e) => handleModalFieldChange(columnIndex, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white transition-all duration-200"
                          />
                        ) : (
                          <input
                            type={getInputType(label)}
                            value={modalFormData[columnIndex] || ''}
                            onChange={(e) => handleModalFieldChange(columnIndex, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white transition-all duration-200"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-300 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeEditModal}
                    className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm"
                  >
                    Cancelar
                  </button>
                  {hasChangesInModal() && (
                    <button
                      onClick={handleResetModal}
                      className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    onClick={saveRow}
                    disabled={savingRow === modalData.absoluteIndex}
                    className={`px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium shadow-sm ${
                      savingRow === modalData.absoluteIndex
                        ? "bg-blue-400 cursor-wait"
                        : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                    }`}
                  >
                    {savingRow === modalData.absoluteIndex ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </div>
                    ) : (
                      "Salvar Alterações"
                    )}
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