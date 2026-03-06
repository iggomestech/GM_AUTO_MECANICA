import { FormEvent, useEffect, useMemo, useState } from "react";
import { request } from "./api";

type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string;
  email?: string;
};
type Vehicle = { id: string; plate: string; model: string; brand: string; year: number; clientId: string; client?: Client };
type WorkOrder = {
  id: string;
  serviceType: string;
  description: string;
  status: string;
  totalCents: number;
  vehicleId: string;
  expectedEnd?: string;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: Vehicle;
};
type VehicleHistory = Vehicle & { workOrders: WorkOrder[]; client: Client };
type MenuKey =
  | "inicio"
  | "servicos-cadastro"
  | "servicos-ultimos"
  | "servicos-encerrados"
  | "clientes"
  | "clientes-historico"
  | "veiculos"
  | "veiculos-historico";

const SERVICE_TYPES = [
  { value: "TROCA_OLEO", label: "Troca de oleo" },
  { value: "REVISAO_GERAL", label: "Revisao geral" },
  { value: "ALINHAMENTO_BALANCEAMENTO", label: "Alinhamento e balanceamento" },
  { value: "ESCAPAMENTO", label: "Escapamento" },
  { value: "FREIOS", label: "Freios" },
  { value: "SUSPENSAO", label: "Suspensao" },
  { value: "EMBREAGEM", label: "Embreagem" },
  { value: "AR_CONDICIONADO", label: "Ar condicionado" },
  { value: "INJECAO_ELETRONICA", label: "Injecao eletronica" },
  { value: "ELETRICA", label: "Eletrica" },
  { value: "TROCA_CORREIA_DENTADA", label: "Troca de correia dentada" },
  { value: "PROBLEMA_MOTOR", label: "Problema no motor" },
  { value: "OUTROS", label: "Outros servicos" }
] as const;

function formatServiceType(value: string) {
  return SERVICE_TYPES.find((item) => item.value === value)?.label ?? value;
}

function formatOrderStatus(value: string) {
  if (value === "OPEN") {
    return "Aberta";
  }
  if (value === "IN_PROGRESS") {
    return "Em andamento";
  }
  if (value === "DONE") {
    return "Concluida";
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);

  if (digits.length <= 6) {
    return `(${ddd}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function parseMoneyToCents(value: string) {
  const raw = value.replace(/[^\d.,-]/g, "").trim();
  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }
  const amount = Number(normalized || "0");
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100);
}

function formatOrderCode(id: string) {
  const seed = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return `OS-${String(seed % 1000000).padStart(6, "0")}`;
}

export function App() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientZipCode, setClientZipCode] = useState("");
  const [clientStreet, setClientStreet] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientNeighborhood, setClientNeighborhood] = useState("");
  const [clientComplement, setClientComplement] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleYear, setVehicleYear] = useState(String(new Date().getFullYear()));
  const [vehicleClientId, setVehicleClientId] = useState("");

  const [orderDescription, setOrderDescription] = useState("");
  const [orderServiceType, setOrderServiceType] = useState<string>(SERVICE_TYPES[0].value);
  const [orderExpectedEnd, setOrderExpectedEnd] = useState("");
  const [orderClientId, setOrderClientId] = useState("");
  const [orderVehicleId, setOrderVehicleId] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [workshopDiagnosis, setWorkshopDiagnosis] = useState("");
  const [partsType, setPartsType] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [diagnosisOrderId, setDiagnosisOrderId] = useState("");
  const [serviceDateStart, setServiceDateStart] = useState("");
  const [serviceDateEnd, setServiceDateEnd] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const [plateSearch, setPlateSearch] = useState("");
  const [history, setHistory] = useState<VehicleHistory | null>(null);
  const [clientHistoryId, setClientHistoryId] = useState("");
  const [newClientFlowId, setNewClientFlowId] = useState("");
  const [activeMenu, setActiveMenu] = useState<MenuKey>("inicio");

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  const authenticated = useMemo(() => token.length > 0, [token]);
  const orderClientVehicles = useMemo(() => {
    if (!orderClientId) {
      return [];
    }
    return vehicles.filter((vehicle) => vehicle.clientId === orderClientId);
  }, [vehicles, orderClientId]);

  useEffect(() => {
    if (!orderClientId) {
      if (orderVehicleId) {
        setOrderVehicleId("");
      }
      return;
    }

    if (orderClientVehicles.length === 1) {
      const onlyVehicleId = orderClientVehicles[0].id;
      if (orderVehicleId !== onlyVehicleId) {
        setOrderVehicleId(onlyVehicleId);
      }
      return;
    }

    if (orderVehicleId && !orderClientVehicles.some((vehicle) => vehicle.id === orderVehicleId)) {
      setOrderVehicleId("");
    }
  }, [orderClientId, orderClientVehicles, orderVehicleId]);

  const estimatedTotal = useMemo(() => {
    const parts = parseMoneyToCents(partsCost);
    const labor = parseMoneyToCents(laborCost);
    return ((parts ?? 0) + (labor ?? 0)) / 100;
  }, [partsCost, laborCost]);

  const dateFilteredOrders = useMemo(() => {
    if (!serviceDateStart && !serviceDateEnd) {
      return orders;
    }

    const start = serviceDateStart ? new Date(`${serviceDateStart}T00:00:00`) : null;
    const end = serviceDateEnd ? new Date(`${serviceDateEnd}T23:59:59`) : null;

    return orders.filter((order) => {
      if (!order.createdAt) {
        return false;
      }
      const createdAt = new Date(order.createdAt);
      if (start && createdAt < start) {
        return false;
      }
      if (end && createdAt > end) {
        return false;
      }
      return true;
    });
  }, [orders, serviceDateStart, serviceDateEnd]);

  const selectedClientVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.clientId === clientHistoryId),
    [vehicles, clientHistoryId]
  );

  const selectedClientOrders = useMemo(() => {
    if (!clientHistoryId) {
      return [];
    }

    const vehicleIds = new Set(selectedClientVehicles.map((vehicle) => vehicle.id));
    return orders.filter((order) => vehicleIds.has(order.vehicleId));
  }, [orders, selectedClientVehicles, clientHistoryId]);

  const platesByClient = useMemo(() => {
    const map = new Map<string, string[]>();
    vehicles.forEach((vehicle) => {
      const current = map.get(vehicle.clientId) ?? [];
      current.push(vehicle.plate);
      map.set(vehicle.clientId, current);
    });
    return map;
  }, [vehicles]);

  async function loadData(authToken = token) {
    const [c, v, o] = await Promise.all([
      request<Client[]>("/clients", {}, authToken),
      request<Vehicle[]>("/vehicles", {}, authToken),
      request<WorkOrder[]>("/work-orders", {}, authToken)
    ]);

    setClients(c);
    setVehicles(v);
    setOrders(o);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await request<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setToken(data.token);
      await loadData(data.token);
      setActiveMenu("inicio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar");
    }
  }

  async function handleLoadData() {
    setError("");
    try {
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados");
    }
  }

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const createdClient = await request<Client>(
        "/clients",
        {
          method: "POST",
          body: JSON.stringify({
            name: clientName,
            phone: clientPhone,
            street: clientStreet,
            number: clientNumber,
            neighborhood: clientNeighborhood,
            city: clientCity,
            state: clientState,
            zipCode: clientZipCode,
            complement: clientComplement,
            email: clientEmail || undefined
          })
        },
        token
      );

      setClients((prev) => [createdClient, ...prev]);
      setClientName("");
      setClientPhone("");
      setClientZipCode("");
      setClientStreet("");
      setClientNumber("");
      setClientNeighborhood("");
      setClientComplement("");
      setClientCity("");
      setClientState("");
      setClientEmail("");
      setNewClientFlowId(createdClient.id);
      setVehicleClientId(createdClient.id);
      setActiveMenu("veiculos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar cliente");
    }
  }

  async function handleLookupCep() {
    setError("");
    const digits = clientZipCode.replace(/\D/g, "");

    if (digits.length !== 8) {
      setError("Informe um CEP valido com 8 digitos.");
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json() as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        complemento?: string;
      };

      if (data.erro) {
        setError("CEP nao encontrado.");
        return;
      }

      if (data.logradouro) {
        setClientStreet(data.logradouro);
      }
      if (data.bairro) {
        setClientNeighborhood(data.bairro);
      }
      if (data.localidade) {
        setClientCity(data.localidade);
      }
      if (data.uf) {
        setClientState(data.uf.toUpperCase());
      }
      if (data.complemento && !clientComplement) {
        setClientComplement(data.complemento);
      }
    } catch {
      setError("Falha ao consultar CEP. Verifique a conexao e tente novamente.");
    }
  }

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault();
    setError("");

    const targetClientId = newClientFlowId || vehicleClientId;
    if (!targetClientId) {
      setError("Selecione o cliente para vincular o veiculo.");
      return;
    }

    try {
      const createdVehicle = await request<Vehicle>(
        "/vehicles",
        {
          method: "POST",
          body: JSON.stringify({
            model: vehicleModel,
            brand: vehicleBrand,
            plate: vehiclePlate,
            year: Number(vehicleYear),
            clientId: targetClientId
          })
        },
        token
      );

      setVehicles((prev) => [createdVehicle, ...prev]);
      setVehicleModel("");
      setVehicleBrand("");
      setVehiclePlate("");
      setVehicleYear(String(new Date().getFullYear()));
      setNewClientFlowId("");
      setOrderClientId(createdVehicle.clientId);
      setOrderVehicleId(createdVehicle.id);
      setActiveMenu("servicos-cadastro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar veiculo");
    }
  }

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const openingDescription = [
        "[ABERTURA]",
        `Relato inicial: ${orderDescription}`,
        `Sintomas apresentados: ${symptoms}`,
        `Data de chegada: ${arrivalDate || "nao informada"}`
      ].join("\n");

      const createdOrder = await request<WorkOrder>(
        "/work-orders",
        {
          method: "POST",
          body: JSON.stringify({
            serviceType: orderServiceType,
            description: openingDescription,
            status: "OPEN",
            totalCents: 0,
            expectedEnd: orderExpectedEnd ? new Date(`${orderExpectedEnd}T12:00:00`).toISOString() : undefined,
            vehicleId: orderVehicleId
          })
        },
        token
      );

      setOrders((prev) => [createdOrder, ...prev]);
      setOrderDescription("");
      setOrderServiceType(SERVICE_TYPES[0].value);
      setOrderExpectedEnd("");
      setOrderClientId("");
      setOrderVehicleId("");
      setArrivalDate("");
      setSymptoms("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar ordem de servico");
    }
  }

  async function submitDiagnosis(markAsDone: boolean) {
    setError("");

    if (!diagnosisOrderId) {
      setError("Selecione uma ordem para registrar diagnostico.");
      return;
    }

    const parsedParts = parseMoneyToCents(partsCost);
    const parsedLabor = parseMoneyToCents(laborCost);
    if (parsedParts === null || parsedLabor === null) {
      setError("Informe valores validos para peca e mao de obra (ex: 350,00).");
      return;
    }

    try {
      const updated = await request<WorkOrder>(
        `/work-orders/${diagnosisOrderId}/diagnosis`,
        {
          method: "PATCH",
          body: JSON.stringify({
            diagnosis: workshopDiagnosis,
            partsType,
            partsCostCents: parsedParts,
            laborCostCents: parsedLabor,
            markAsDone
          })
        },
        token
      );

      setOrders((prev) => prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)));
      setDiagnosisOrderId("");
      setWorkshopDiagnosis("");
      setPartsType("");
      setPartsCost("");
      setLaborCost("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar diagnostico da OS");
    }
  }

  async function handleSearchHistory(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const data = await request<VehicleHistory>(`/vehicles/history/${encodeURIComponent(plateSearch)}`, {}, token);
      setHistory(data);
    } catch (err) {
      setHistory(null);
      setError(err instanceof Error ? err.message : "Falha ao buscar historico");
    }
  }

  function handleLogout() {
    setToken("");
    setHistory(null);
    setError("");
  }

  function handlePrintBudget(order: WorkOrder) {
    const clientName = order.vehicle?.client?.name || "Cliente";
    const vehiclePlate = order.vehicle?.plate || "-";
    const vehicleLabel = `${order.vehicle?.brand || ""} ${order.vehicle?.model || ""}`.trim() || "-";
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR") : "-";
    const closedAt = order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("pt-BR") : "-";
    const scheduleLabel = order.status === "DONE" ? "Encerramento" : "Previsao";
    const scheduleValue = order.status === "DONE"
      ? closedAt
      : order.expectedEnd
        ? new Date(order.expectedEnd).toLocaleDateString("pt-BR")
        : "-";
    const total = `R$ ${(order.totalCents / 100).toFixed(2)}`;
    const orderCode = formatOrderCode(order.id);

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      setError("Nao foi possivel abrir a janela de impressao. Verifique o bloqueador de pop-up.");
      return;
    }

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Orcamento ${escapeHtml(order.id)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 6px 0; }
      .box { border: 1px solid #d9d9d9; border-radius: 8px; padding: 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .muted { color: #555; }
      .desc { white-space: pre-line; }
      .total { margin-top: 16px; font-size: 20px; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Orcamento de Servico</h1>
    <p class="muted">GM Sistema - Oficina Mecanica</p>
    <section class="box">
      <h2>Dados da ordem</h2>
      <div class="grid">
        <p><strong>Codigo:</strong> ${escapeHtml(orderCode)}</p>
        <p><strong>Status:</strong> ${escapeHtml(formatOrderStatus(order.status))}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
        <p><strong>Placa:</strong> ${escapeHtml(vehiclePlate)}</p>
        <p><strong>Veiculo:</strong> ${escapeHtml(vehicleLabel)}</p>
        <p><strong>Servico:</strong> ${escapeHtml(formatServiceType(order.serviceType))}</p>
        <p><strong>Abertura:</strong> ${escapeHtml(createdAt)}</p>
        <p><strong>${escapeHtml(scheduleLabel)}:</strong> ${escapeHtml(scheduleValue)}</p>
      </div>
      <p class="desc"><strong>Descricao:</strong> ${escapeHtml(order.description)}</p>
      <p class="total">Total: ${escapeHtml(total)}</p>
    </section>
    <script>
      window.onload = function () {
        window.print();
        window.close();
      };
    </script>
  </body>
</html>`;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function handleWhatsAppComingSoon() {
    setError("Envio de orcamento via WhatsApp sera disponibilizado na proxima atualizacao do sistema.");
  }

  const searchedOrders = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) {
      return dateFilteredOrders;
    }

    return dateFilteredOrders.filter((order) => {
      const plate = (order.vehicle?.plate || "").toLowerCase();
      const client = (order.vehicle?.client?.name || "").toLowerCase();
      const isoDate = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
      const brDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR").toLowerCase() : "";

      return plate.includes(term) || client.includes(term) || isoDate.includes(term) || brDate.includes(term);
    });
  }, [dateFilteredOrders, serviceSearch]);

  const pendingOrders = useMemo(() => searchedOrders.filter((o) => o.status === "OPEN"), [searchedOrders]);
  const inProgressOrders = useMemo(() => searchedOrders.filter((o) => o.status === "IN_PROGRESS"), [searchedOrders]);
  const doneOrders = useMemo(() => searchedOrders.filter((o) => o.status === "DONE"), [searchedOrders]);

  if (!authenticated) {
    return (
      <main className="layout">
        <header>
          <div className="brand-mark">
            <img src="branding/logo/logo.jpg" alt="Logo da empresa" className="brand-logo" />
          </div>
          <h1>GM Sistema - Oficina Mecanica</h1>
          <p>Clientes, veiculos e ordens de servico em um unico painel.</p>
        </header>

        <section className="card login-shell">
          <div className="login-cover" aria-hidden="true">
            <img src="branding/login-capa.jpg" alt="" className="login-cover-image" />
          </div>
          <div>
            <h2>Autenticacao</h2>
            <form className="form" onSubmit={handleLogin}>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password" />
              <button type="submit">Entrar</button>
            </form>
            {error ? <p className="error">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark sidebar-brand">
          <img src="branding/logo/logo.jpg" alt="Logo da empresa" className="brand-logo" />
        </div>
        <p className="sidebar-caption">Menu principal</p>
        <nav className="menu menu-vertical">
          <section className="menu-section">
            <p className="menu-group-title">Inicio</p>
            <button className={`submenu-btn ${activeMenu === "inicio" ? "active" : ""}`} onClick={() => setActiveMenu("inicio")}>
              Tela de boas-vindas
            </button>
          </section>

          <section className="menu-section">
            <p className="menu-group-title">Clientes</p>
            <button
              className={`submenu-btn ${activeMenu === "clientes" ? "active" : ""}`}
              onClick={() => setActiveMenu("clientes")}
            >
              Cadastrar cliente
            </button>
            <button
              className={`submenu-btn ${activeMenu === "clientes-historico" ? "active" : ""}`}
              onClick={() => setActiveMenu("clientes-historico")}
            >
              Consulta historico do cliente
            </button>
          </section>

          <section className="menu-section">
            <p className="menu-group-title">Veiculos</p>
            <button
              className={`submenu-btn ${activeMenu === "veiculos" ? "active" : ""}`}
              onClick={() => {
                setNewClientFlowId("");
                setActiveMenu("veiculos");
              }}
            >
              Cadastrar veiculo
            </button>
            <button
              className={`submenu-btn ${activeMenu === "veiculos-historico" ? "active" : ""}`}
              onClick={() => setActiveMenu("veiculos-historico")}
            >
              Consulta historico do veiculo
            </button>
          </section>

          <section className="menu-section">
            <p className="menu-group-title">Servicos</p>
            <button
              className={`submenu-btn ${activeMenu === "servicos-cadastro" ? "active" : ""}`}
              onClick={() => setActiveMenu("servicos-cadastro")}
            >
              Cadastrar nova ordem de servico
            </button>
            <button
              className={`submenu-btn ${activeMenu === "servicos-ultimos" ? "active" : ""}`}
              onClick={() => setActiveMenu("servicos-ultimos")}
            >
              Ultimos servicos e filtros
            </button>
            <button
              className={`submenu-btn ${activeMenu === "servicos-encerrados" ? "active" : ""}`}
              onClick={() => setActiveMenu("servicos-encerrados")}
            >
              Servicos encerrados
            </button>
          </section>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>Sair</button>
      </aside>

      <section className="card main-panel">
        {error ? <p className="error">{error}</p> : null}

        {activeMenu === "inicio" ? (
          <div className="home-view">
            <h2>Boas-vindas ao GM Sistema</h2>
            <p className="muted">Use o menu lateral para seguir o fluxo. Esta e a tela inicial do sistema.</p>

            <section className="home-summary mt">
              <article>
                <h3>Clientes</h3>
                <p className="home-number">{clients.length}</p>
                <p className="muted">Cadastros ativos no sistema.</p>
              </article>
              <article>
                <h3>Veiculos</h3>
                <p className="home-number">{vehicles.length}</p>
                <p className="muted">Placas vinculadas aos clientes.</p>
              </article>
              <article>
                <h3>Ordens de servico</h3>
                <p className="home-number">{orders.length}</p>
                <p className="muted">OS abertas, em andamento e concluidas.</p>
              </article>
            </section>

            <article className="onboarding mt">
              <h3>Primeiros passos no sistema</h3>
              <p className="muted">Para um atendimento completo, siga esta ordem:</p>
              <ol className="onboarding-steps">
                <li>
                  <strong>1. Cadastrar cliente</strong>
                  <span>Salve os dados basicos do proprietario.</span>
                </li>
                <li>
                  <strong>2. Cadastrar veiculo</strong>
                  <span>Vincule um ou mais veiculos ao cliente.</span>
                </li>
                <li>
                  <strong>3. Abrir ordem de servico</strong>
                  <span>Registre sintomas na chegada e complete diagnostico/custos depois.</span>
                </li>
              </ol>
              <div className="onboarding-actions">
                <button type="button" onClick={() => setActiveMenu("clientes")}>Ir para Clientes</button>
                <button type="button" onClick={() => setActiveMenu("veiculos")}>Ir para Veiculos</button>
                <button type="button" onClick={() => setActiveMenu("servicos-cadastro")}>Ir para Servicos</button>
              </div>
            </article>

            <section className="grid mt">
              <article>
                <h3>Dica rapida</h3>
                <p className="muted">Quando o cliente chegar, abra a OS com sintomas e data de entrada.</p>
                <p className="muted">Depois, finalize com diagnostico, pecas e mao de obra em "Ultimos servicos e filtros".</p>
              </article>
              <article>
                <h3>Atalhos do dia</h3>
                <div className="onboarding-actions">
                  <button type="button" onClick={() => setActiveMenu("servicos-ultimos")}>Ver ultimos servicos</button>
                  <button type="button" onClick={() => setActiveMenu("servicos-encerrados")}>Ver servicos encerrados</button>
                  <button type="button" onClick={() => setActiveMenu("clientes-historico")}>Historico por cliente</button>
                  <button type="button" onClick={() => setActiveMenu("veiculos-historico")}>Historico por veiculo</button>
                </div>
              </article>
            </section>
          </div>
        ) : null}

        {activeMenu === "servicos-cadastro" ? (
          <div>
            <h2>Servicos - Cadastro de ordem</h2>
            <p className="muted">Preencha os dados na sequencia. O total sera calculado automaticamente.</p>
            <button className="btn-sm" onClick={handleLoadData}>Atualizar dados</button>

            <form className="form form-wide mt" onSubmit={handleCreateOrder}>
              <h3>Abertura da ordem de servico (recepcao)</h3>
              <select value={orderClientId} onChange={(e) => setOrderClientId(e.target.value)} required>
                <option value="">Selecione o cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>

              <select
                value={orderVehicleId}
                onChange={(e) => setOrderVehicleId(e.target.value)}
                required
                disabled={!orderClientId}
              >
                <option value="">
                  {orderClientId ? "Selecione a placa do veiculo" : "Selecione o cliente primeiro"}
                </option>
                {orderClientVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model} ({v.year})
                  </option>
                ))}
              </select>

              {orderClientId && orderClientVehicles.length === 1 ? (
                <p className="muted">Veiculo unico encontrado para este cliente. Placa carregada automaticamente.</p>
              ) : null}
              {orderClientId && orderClientVehicles.length === 0 ? (
                <p className="error">Este cliente ainda nao possui veiculo cadastrado.</p>
              ) : null}

              <select value={orderServiceType} onChange={(e) => setOrderServiceType(e.target.value)}>
                {SERVICE_TYPES.map((serviceType) => (
                  <option key={serviceType.value} value={serviceType.value}>{serviceType.label}</option>
                ))}
              </select>

              <textarea
                value={orderDescription}
                onChange={(e) => setOrderDescription(e.target.value)}
                placeholder="Descricao inicial do servico"
                rows={3}
                required
              />
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                placeholder="Data de chegada do veiculo"
                required
              />
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Sintomas apresentados"
                rows={3}
                required
              />
              <input
                type="date"
                value={orderExpectedEnd}
                onChange={(e) => setOrderExpectedEnd(e.target.value)}
                placeholder="Previsao de termino"
              />

              <button type="submit">Abrir ordem de servico</button>
            </form>

            <div className="grid">
              <article>
                <h3>Resumo</h3>
                <p>Clientes cadastrados: {clients.length}</p>
                <p>Veiculos cadastrados: {vehicles.length}</p>
                <p>Ordens registradas: {orders.length}</p>
              </article>
            </div>

          </div>
        ) : null}

        {activeMenu === "servicos-ultimos" ? (
          <div>
            <h2>Servicos - Ultimos servicos</h2>
            <p className="muted">Use a busca para localizar por placa, cliente ou data. Em seguida, refine pelo periodo.</p>
            <div className="grid">
              <article>
                <h3>Filtro de data</h3>
                <div className="form">
                  <input
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Buscar (placa, cliente ou data: 05/03/2026)"
                  />
                  <input type="date" value={serviceDateStart} onChange={(e) => setServiceDateStart(e.target.value)} />
                  <input type="date" value={serviceDateEnd} onChange={(e) => setServiceDateEnd(e.target.value)} />
                </div>
              </article>
            </div>

            <h3>Servicos pendentes</h3>
            <div className="service-list mt">
              {pendingOrders.map((o) => (
                <article key={o.id} className="service-item">
                  <div className="service-item-head">
                    <strong>{o.vehicle?.client?.name || "Cliente"}</strong>
                    <span className="service-status">{formatOrderStatus(o.status)}</span>
                  </div>
                  <p className="muted">Codigo: {formatOrderCode(o.id)}</p>
                  <p className="muted">Placa: {o.vehicle?.plate || "-"} | Servico: {formatServiceType(o.serviceType)}</p>
                  <p className="muted">Abertura: {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "-"}</p>
                  <p><strong>Total:</strong> R$ {(o.totalCents / 100).toFixed(2)}</p>
                  <div className="service-actions">
                    <button className="btn-sm" type="button" onClick={() => handlePrintBudget(o)}>
                    Imprimir orcamento
                    </button>
                    <button
                      className="btn-sm"
                    type="button"
                    onClick={handleWhatsAppComingSoon}
                    title="Sera disponibilizado na proxima atualizacao do sistema"
                    >
                    Enviar via WhatsApp
                    </button>
                    <button
                      className="btn-sm"
                    type="button"
                    onClick={() => {
                      setDiagnosisOrderId(o.id);
                    }}
                    >
                    Editar
                    </button>
                  </div>
                </article>
              ))}
              {pendingOrders.length === 0 ? <p className="muted">Nenhum servico pendente no filtro atual.</p> : null}
            </div>

            <h3 className="mt">Servicos em andamento</h3>
            <div className="service-list mt">
              {inProgressOrders.map((o) => (
                <article key={o.id} className="service-item">
                  <div className="service-item-head">
                    <strong>{o.vehicle?.client?.name || "Cliente"}</strong>
                    <span className="service-status">{formatOrderStatus(o.status)}</span>
                  </div>
                  <p className="muted">Codigo: {formatOrderCode(o.id)}</p>
                  <p className="muted">Placa: {o.vehicle?.plate || "-"} | Servico: {formatServiceType(o.serviceType)}</p>
                  <p className="muted">Abertura: {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "-"}</p>
                  <p><strong>Total:</strong> R$ {(o.totalCents / 100).toFixed(2)}</p>
                  <div className="service-actions">
                    <button className="btn-sm" type="button" onClick={() => handlePrintBudget(o)}>
                      Imprimir orcamento
                    </button>
                    <button
                      className="btn-sm"
                      type="button"
                      onClick={handleWhatsAppComingSoon}
                      title="Sera disponibilizado na proxima atualizacao do sistema"
                    >
                      Enviar via WhatsApp
                    </button>
                    <button
                      className="btn-sm"
                      type="button"
                      onClick={() => {
                        setDiagnosisOrderId(o.id);
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
              {inProgressOrders.length === 0 ? <p className="muted">Nenhum servico em andamento no filtro atual.</p> : null}
            </div>

            {diagnosisOrderId ? (
              <article className="onboarding mt">
                <h3>Completar diagnostico da OS</h3>
                <p className="muted">Finalize agora com analise, pecas e mao de obra para gerar o valor final.</p>
                <form
                  className="form form-wide"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitDiagnosis(false);
                  }}
                >
                  <textarea
                    value={workshopDiagnosis}
                    onChange={(e) => setWorkshopDiagnosis(e.target.value)}
                    placeholder="Analise e diagnostico da oficina"
                    rows={4}
                    required
                  />
                  <input value={partsType} onChange={(e) => setPartsType(e.target.value)} placeholder="Tipo da peca" required />
                  <input value={partsCost} onChange={(e) => setPartsCost(e.target.value)} placeholder="Valor da peca (ex: 350.00)" required />
                  <input value={laborCost} onChange={(e) => setLaborCost(e.target.value)} placeholder="Mao de obra (ex: 200.00)" required />
                  <p>Valor final: <strong>R$ {estimatedTotal.toFixed(2)}</strong></p>
                  <div className="service-actions">
                    <button type="submit">Salvar diagnostico e custos</button>
                    <button type="button" onClick={() => void submitDiagnosis(true)}>Finalizar ordem de servico</button>
                  </div>
                </form>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeMenu === "servicos-encerrados" ? (
          <div>
            <h2>Servicos encerrados</h2>
            <p className="muted">Consulte ordens finalizadas por placa, cliente ou data.</p>

            <div className="grid">
              <article>
                <h3>Filtro de data</h3>
                <div className="form">
                  <input
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Buscar (placa, cliente ou data: 05/03/2026)"
                  />
                  <input type="date" value={serviceDateStart} onChange={(e) => setServiceDateStart(e.target.value)} />
                  <input type="date" value={serviceDateEnd} onChange={(e) => setServiceDateEnd(e.target.value)} />
                </div>
              </article>
            </div>

            <div className="service-list mt">
              {doneOrders.map((o) => (
                <article key={o.id} className="service-item">
                  <div className="service-item-head">
                    <strong>{o.vehicle?.client?.name || "Cliente"}</strong>
                    <span className="service-status">{formatOrderStatus(o.status)}</span>
                  </div>
                  <p className="muted">Codigo: {formatOrderCode(o.id)}</p>
                  <p className="muted">Placa: {o.vehicle?.plate || "-"} | Servico: {formatServiceType(o.serviceType)}</p>
                  <p className="muted">Abertura: {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "-"}</p>
                  <p><strong>Total:</strong> R$ {(o.totalCents / 100).toFixed(2)}</p>
                  <div className="service-actions">
                    <button className="btn-sm" type="button" onClick={() => handlePrintBudget(o)}>
                      Imprimir orcamento
                    </button>
                    <button
                      className="btn-sm"
                      type="button"
                      onClick={handleWhatsAppComingSoon}
                      title="Sera disponibilizado na proxima atualizacao do sistema"
                    >
                      Enviar via WhatsApp
                    </button>
                  </div>
                </article>
              ))}
              {doneOrders.length === 0 ? <p className="muted">Nenhum servico encerrado no filtro atual.</p> : null}
            </div>
          </div>
        ) : null}

        {activeMenu === "clientes" ? (
          <div>
            <h2>Tela de Clientes</h2>
            <p className="muted">Cadastre o cliente uma vez. Depois voce pode vincular quantos veiculos forem necessarios.</p>
            <form className="form" onSubmit={handleCreateClient}>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
              <input
                value={clientPhone}
                onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                placeholder="Telefone (11) 91234-5678"
              />
              <input
                value={clientZipCode}
                onChange={(e) => setClientZipCode(formatCep(e.target.value))}
                placeholder="CEP"
              />
              <button type="button" className="btn-sm" onClick={handleLookupCep}>Buscar CEP</button>
              <input value={clientStreet} onChange={(e) => setClientStreet(e.target.value)} placeholder="Rua ou avenida" />
              <input value={clientNumber} onChange={(e) => setClientNumber(e.target.value)} placeholder="Numero" />
              <input value={clientNeighborhood} onChange={(e) => setClientNeighborhood(e.target.value)} placeholder="Bairro" />
              <input value={clientComplement} onChange={(e) => setClientComplement(e.target.value)} placeholder="Complemento" />
              <input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="Cidade" />
              <input
                value={clientState}
                onChange={(e) => setClientState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="Estado (UF)"
              />
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email (opcional)" />
              <button type="submit">Cadastrar cliente e avancar para veiculo</button>
            </form>

            <div className="list-box">
              {clients.map((c) => (
                <div key={c.id} className="list-row">
                  <strong>{c.name}</strong>
                  <span>{c.phone}</span>
                  <span className="client-address">
                    <span>{c.street && c.number ? `${c.street}, ${c.number}` : c.address || "Endereco nao informado"}</span>
                    <span className="muted">
                      {`${c.neighborhood || "Bairro nao informado"} - ${c.city || "Cidade nao informada"}/${c.state || "--"} - CEP ${c.zipCode || "nao informado"}`}
                    </span>
                  </span>
                  <span>Placas: {(platesByClient.get(c.id) ?? []).join(", ") || "Nenhuma"}</span>
                  <span>{c.email || "-"}</span>
                </div>
              ))}
              {clients.length === 0 ? <p>Nenhum cliente cadastrado.</p> : null}
            </div>
          </div>
        ) : null}

        {activeMenu === "veiculos" ? (
          <div>
            <h2>Tela de Veiculos</h2>
            <p className="muted">Um mesmo cliente pode ter varias placas. Selecione o cliente e cadastre um veiculo por vez.</p>
            <form className="form" onSubmit={handleCreateVehicle}>
              <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Modelo" />
              <input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="Marca" />
              <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="Placa" />
              <input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="Ano" />

              {newClientFlowId ? (
                <p className="muted">
                  Cliente selecionado automaticamente: <strong>{clients.find((c) => c.id === newClientFlowId)?.name || "Cliente recem-cadastrado"}</strong>
                </p>
              ) : (
                <select value={vehicleClientId} onChange={(e) => setVehicleClientId(e.target.value)}>
                  <option value="">Selecione o cliente (pode ter mais de uma placa)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              <button type="submit">Cadastrar veiculo e avancar para servicos</button>
            </form>

            <div className="list-box">
              <div className="list-row list-head" aria-hidden="true">
                <strong>Modelo</strong>
                <strong>Marca</strong>
                <strong>Placa</strong>
                <strong>Ano</strong>
              </div>
              {vehicles.map((v) => (
                <div key={v.id} className="list-row">
                  <strong>{v.model}</strong>
                  <span>{v.brand}</span>
                  <span>{v.plate}</span>
                  <span>{v.year}</span>
                </div>
              ))}
              {vehicles.length === 0 ? <p>Nenhum veiculo cadastrado.</p> : null}
            </div>
          </div>
        ) : null}

        {activeMenu === "veiculos-historico" ? (
          <div>
            <h2>Consulta historico do veiculo</h2>
            <form className="form" onSubmit={handleSearchHistory}>
              <input
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
                placeholder="Digite a placa (ex: ABC1234)"
              />
              <button type="submit">Buscar historico</button>
            </form>

            {history ? (
              <article className="history">
                <h3>{history.plate} - {history.brand} {history.model} ({history.year})</h3>
                <p>Cliente: {history.client.name} - {history.client.phone}</p>
                <h4>Manutencoes realizadas ({history.workOrders.length})</h4>
                {history.workOrders.map((order) => (
                  <p key={order.id}>
                    {order.description} | {formatOrderStatus(order.status)} | R$ {(order.totalCents / 100).toFixed(2)}
                    {order.createdAt ? ` | ${new Date(order.createdAt).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                ))}
                {history.workOrders.length === 0 ? <p>Nenhuma manutencao registrada.</p> : null}
              </article>
            ) : null}
          </div>
        ) : null}

        {activeMenu === "clientes-historico" ? (
          <div>
            <h2>Consulta historico do cliente</h2>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
              <select value={clientHistoryId} onChange={(e) => setClientHistoryId(e.target.value)}>
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
            </form>

            {clientHistoryId ? (
              <article className="history">
                <h3>Resumo do cliente</h3>
                <p>Veiculos cadastrados: {selectedClientVehicles.length}</p>
                <p>Ordens de servico: {selectedClientOrders.length}</p>

                <h4>Veiculos</h4>
                {selectedClientVehicles.map((vehicle) => (
                  <p key={vehicle.id}>
                    {vehicle.model} | {vehicle.brand} | {vehicle.plate} | {vehicle.year}
                  </p>
                ))}
                {selectedClientVehicles.length === 0 ? <p>Nenhum veiculo cadastrado.</p> : null}

                <h4>Ordens</h4>
                {selectedClientOrders.map((order) => (
                  <p key={order.id}>
                    {formatServiceType(order.serviceType)} | {formatOrderStatus(order.status)} | R$ {(order.totalCents / 100).toFixed(2)}
                  </p>
                ))}
                {selectedClientOrders.length === 0 ? <p>Nenhuma ordem encontrada.</p> : null}
              </article>
            ) : null}
          </div>
        ) : null}

      </section>
    </main>
  );
}
