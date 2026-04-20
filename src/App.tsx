import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Joyride, STATUS, Step, EVENTS, ACTIONS } from "react-joyride";
import {
  Activity,
  Play,
  TrendingUp,
  Info,
  AlertTriangle,
  Network,
  HelpCircle,
  PlusCircle,
  X,
  BrainCircuit,
  Globe,
  RotateCcw,
  Save
} from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { generateMockData } from "./mockData";
import Chatbot from "./components/Chatbot";
import {
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Define SVG Paths for our icons based on Lucide
const svgPaths = {
  seller: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h2V14h8v8h2a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>',
  product: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  category: '<path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/><path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414l8.204 8.204a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/>',
  customer: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
};

const getSvgUri = (pathData: string, strokeValue: string) => 
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeValue}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`)}`;

// Preload Images
const iconCache: Record<string, HTMLImageElement> = {};
['seller', 'product', 'category', 'customer'].forEach(type => {
  const img = new Image();
  img.src = getSvgUri(svgPaths[type as keyof typeof svgPaths], '#ffffff'); 
  iconCache[type] = img;
});

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2"><AlertTriangle /> Error rendering graph: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

export default function App() {
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Custom Modals & Simulation
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', price: 100, categoryId: '' });
  const [priceChange, setPriceChange] = useState<number>(0);
  const [xaiMessage, setXaiMessage] = useState<string | null>(null);

  const [graphData, setGraphData] = useState({
    nodes: [],
    links: [],
    products: [],
    sellers: [],
    categories: [],
  });
  const d3DataRef = useRef<{nodes: any[], links: any[]}>({ nodes: [], links: [] });
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);
  const [compType, setCompType] = useState<'product' | 'seller' | 'category'>('product');
  const [compMetric, setCompMetric] = useState<string>('demand');
  
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Economic Scenarios & Optimization
  const [marketCondition, setMarketCondition] = useState<'normal' | 'recession' | 'growth'>('normal');
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [scenarioNameInput, setScenarioNameInput] = useState('');

  const applyMarketCondition = (cond: 'normal' | 'recession' | 'growth') => {
    setMarketCondition(cond);
    let mMultiplier = 1; let eMultiplier = 1;
    if (cond === 'recession') { mMultiplier = 0.7; eMultiplier = 1.3; }
    else if (cond === 'growth') { mMultiplier = 1.3; eMultiplier = 0.8; }

    const newGraphData = JSON.parse(JSON.stringify(graphData, (k, v) => (k === 'source' || k === 'target') && v?.id ? v.id : v));
    
    // Update trực tiếp vào node để D3.js nhận diện được lực nảy (vx, vy)
    newGraphData.products.forEach((p: any) => {
      const normalIntercept = p.originalDemand + (1.5 * p.demandElasticity) * p.originalPrice;
      const baseIntercept = normalIntercept * mMultiplier;
      const currentE = p.demandElasticity * eMultiplier;
      const slope = 1.5 * currentE;
      
      p.demand = Math.max(0, Math.floor(baseIntercept - slope * p.price));
      p.vx = (Math.random() - 0.5) * 250;
      p.vy = (Math.random() - 0.5) * 250;
    });

    newGraphData.sellers.forEach((s: any) => {
      const sp = newGraphData.products.filter((p: any) => p.sellerId === s.id);
      s.profit = Math.floor(sp.reduce((sum: number, p: any) => sum + ((p.price - p.cost) * p.demand), 0));
    });

    setGraphData(newGraphData);
    setXaiMessage(`Chuyển sang nền kinh tế: ${cond === 'normal' ? 'Bình thường' : cond === 'recession' ? 'Suy thoái' : 'Phát triển'}. Nhu cầu thị trường đã thay đổi.`);
    setTimeout(() => graphRef.current?.d3ReheatSimulation(), 100);
  };

  const optimizeMyProfit = () => {
    let mMultiplier = 1; let eMultiplier = 1;
    if (marketCondition === 'recession') { mMultiplier = 0.7; eMultiplier = 1.3; }
    else if (marketCondition === 'growth') { mMultiplier = 1.3; eMultiplier = 0.8; }

    const newGraphData = JSON.parse(JSON.stringify(graphData, (k, v) => (k === 'source' || k === 'target') && v?.id ? v.id : v));
    const mySeller = newGraphData.sellers.find((s: any) => s.isMe);
    if (!mySeller) return;

    let totalGain = 0;

    newGraphData.products.forEach((p: any) => {
      if (p.sellerId === mySeller.id) {
        const normalIntercept = p.originalDemand + (1.5 * p.demandElasticity) * p.originalPrice;
        const baseIntercept = normalIntercept * mMultiplier;
        const currentE = p.demandElasticity * eMultiplier;
        const slope = 1.5 * currentE;

        const optimalPrice = (baseIntercept + slope * p.cost) / (2 * slope);
        const safePrice = Math.max(p.cost * 1.1, Math.round(optimalPrice));
        const newDemand = Math.max(0, Math.floor(baseIntercept - slope * safePrice));
        
        totalGain += ((safePrice - p.cost) * newDemand) - ((p.price - p.cost) * p.demand);

        p.price = safePrice;
        p.demand = newDemand;
        p.vx = (Math.random() - 0.5) * 250;
        p.vy = (Math.random() - 0.5) * 250;
      }
    });

    newGraphData.sellers.forEach((s: any) => {
      const sp = newGraphData.products.filter((p: any) => p.sellerId === s.id);
      s.profit = Math.floor(sp.reduce((sum: number, p: any) => sum + ((p.price - p.cost) * p.demand), 0));
    });

    setGraphData(newGraphData);
    setXaiMessage(`✅ Đã tối ưu giá tự động cho cửa hàng của bạn. Lợi nhuận dự kiến tăng: $${Math.floor(totalGain).toLocaleString()}`);
    setTimeout(() => graphRef.current?.d3ReheatSimulation(), 100);
    
    // Truyền profit đã tính toán xong xuống hàm save
    const mySellerAfterOpt = newGraphData.sellers.find((s: any) => s.isMe);
    if (scenarioNameInput) saveScenarioByName(scenarioNameInput, mySellerAfterOpt?.profit);
    else saveScenarioByName("Tối ưu hóa lợi nhuận", mySellerAfterOpt?.profit);
  };

  const resetSimulation = () => {
    if (initialData) {
      const parsed = JSON.parse(JSON.stringify(initialData));
      parsed.products = parsed.nodes.filter((n: any) => n.type === 'product');
      parsed.sellers = parsed.nodes.filter((n: any) => n.type === 'seller');
      parsed.categories = parsed.nodes.filter((n: any) => n.type === 'category');
      
      setGraphData(parsed);
      setMarketCondition('normal');
      setPriceChange(0);
      setXaiMessage("Biểu đồ và giả lập đã được khôi phục về trạng thái gốc.");
      setTimeout(() => graphRef.current?.d3ReheatSimulation(), 100);
    }
  };

  const saveScenarioByName = (customName?: any, newProfit?: number, newPrice?: number) => {
    let nameToSave = typeof customName === 'string' && customName.trim() ? customName : scenarioNameInput;
    if (!nameToSave || !nameToSave.trim()) return;
    
    // Ưu tiên lấy lợi nhuận mới tính toán được truyền vào
    const mySeller = graphData.sellers.find((s: any) => s.isMe);
    const profitToSave = newProfit !== undefined ? newProfit : (mySeller?.profit || 0);

    setSavedScenarios(prev => [...prev, {
      id: Date.now(),
      name: nameToSave.trim(),
      condition: marketCondition,
      profit: profitToSave,
      price: newPrice // Lưu thêm giá sản phẩm vào lịch sử
    }]);

    if (typeof customName !== 'string') {
      setScenarioNameInput('');
    }
  };

  const saveScenario = () => saveScenarioByName();

  const steps: Step[] = [
    {
      target: '.graph-container',
      content: 'Chào mừng bạn đến với mô phỏng Digital Twin. Không gian này hiển thị lưới quan hệ giữa Sản phẩm, Cửa hàng và Danh mục.',
      disableBeacon: true,
    },
    {
      target: '.network-legend',
      content: 'Đây là bảng chú giải. Bạn (Me - My Store) được làm nổi bật với màu Tím để phân biệt với Đối thủ (Xanh dương).',
    },
    {
      target: '.add-product-btn',
      content: 'Bạn có thể tự tạo một sản phẩm mới để mô phỏng đưa vào thị trường.',
    },
    {
      target: '.compare-mode-toggle',
      content: 'Bật Compare Mode (hoặc giữ Shift + Click) để chọn nhiều đối tượng cùng lúc và so sánh các chỉ số.',
    },
    {
      target: '.intelligence-dashboard',
      content: 'Bảng điều khiển này sẽ hiển thị dự báo nhu cầu dựa trên độ co giãn giá cả khi bạn chọn một sản phẩm. Hãy khám phá ngay nhé!',
    },
    {
      target: '.chatbot-btn',
      content: 'Cuối cùng là Trợ lý AI (Chatbot). Bạn có thể hỏi đáp thông tin bất kỳ, tự do di chuyển icon và thậm chí là kéo thả hay thay đổi kích thước khung chat!',
    }
  ];

  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    const rawData = generateMockData();
    
    // 1. Dữ liệu dành cho Giao diện UI (Có thể bị khóa cũng không sao)
    const uiData = JSON.parse(JSON.stringify(rawData));
    uiData.products = uiData.nodes.filter((n: any) => n.type === 'product');
    uiData.sellers = uiData.nodes.filter((n: any) => n.type === 'seller');
    uiData.categories = uiData.nodes.filter((n: any) => n.type === 'category');
    
    setGraphData(uiData);
    setInitialData(JSON.parse(JSON.stringify(uiData)));

    // 2. Dữ liệu dành riêng cho biểu đồ D3 (Tuyệt đối không bị khóa)
    d3DataRef.current = JSON.parse(JSON.stringify(rawData));
    
    const isTutorialCompleted = localStorage.getItem('retailAiTutorialCompleted');
    if (!isTutorialCompleted) {
      const tourTimer = setTimeout(() => setRunTour(true), 1000);
      return () => clearTimeout(tourTimer);
    }
  }, []);

  useEffect(() => {
    if (!d3DataRef.current.nodes.length && !graphData.nodes.length) return;

    graphData.nodes.forEach((uiNode: any) => {
      const d3Node = d3DataRef.current.nodes.find((n: any) => n.id === uiNode.id);
      if (d3Node) {
        const { x, y, index, ...safeProps } = uiNode;
        Object.assign(d3Node, safeProps);
      } else {
        d3DataRef.current.nodes.push({ ...uiNode });
      }
    });

    graphData.links.forEach((uiLink: any) => {
      const linkExists = d3DataRef.current.links.find(
        (l: any) =>
          (typeof l.source === "object" ? l.source.id : l.source) ===
            (typeof uiLink.source === "object" ? uiLink.source.id : uiLink.source) &&
          (typeof l.target === "object" ? l.target.id : l.target) ===
            (typeof uiLink.target === "object" ? uiLink.target.id : uiLink.target)
      );
      if (!linkExists) d3DataRef.current.links.push({ ...uiLink });
    });
  }, [graphData]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (graphRef.current) {
        // Lực đẩy nền cơ bản, giữ các node không bị dính vào nhau
        graphRef.current.d3Force('charge').strength(-400);
        
        // KHÔI PHỤC LOGIC GỐC: Khoảng cách cố định, KHÔNG co giãn
        graphRef.current.d3Force('link').distance((link: any) => {
          // Nếu là cạnh tranh thì cách nhau 180, các liên kết khác cách 80
          return link.type === 'competes_with' ? 180 : 80; 
        });
        
        // Cập nhật lại đồ thị
        graphRef.current.d3ReheatSimulation();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [graphData]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = Math.max(12 / globalScale, 2);
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;

    const isPrimarySelected = selectedNodes.some(n => n.id === node.id);
    let isSecondarySelected = false;
    let isDimmed = false;

    if (selectedNodes.length > 0) {
      // If a seller is selected, highlight their products and categories of those products
      if (selectedNodes[0].type === 'seller') {
         const sellerProducts = graphData.products.filter(p => p.sellerId === selectedNodes[0].id);
         const sellerCategories = sellerProducts.map(p => p.categoryId);
         const sellerCustomers = sellerProducts.map(p => p.targetCustomerId);
         
         if (node.type === 'product' && sellerProducts.some(p => p.id === node.id)) {
           isSecondarySelected = true;
         } else if (node.type === 'category' && sellerCategories.includes(node.id)) {
           isSecondarySelected = true;
         } else if (node.type === 'customer' && sellerCustomers.includes(node.id)) {
           isSecondarySelected = true;
         } else if (!isPrimarySelected) {
           isDimmed = true;
         }
      } else {
        const selectedProducts = selectedNodes.filter(n => n.type === 'product');
        const selectedCategories = selectedProducts.map(n => n.categoryId);
        const selectedCustomers = selectedProducts.map(n => n.targetCustomerId);
        
        if (node.type === 'product' && selectedCategories.includes(node.categoryId) && !isPrimarySelected) {
          isSecondarySelected = true;
        } else if (node.type === 'category' && selectedCategories.includes(node.id)) {
          isSecondarySelected = true;
        } else if (node.type === 'customer' && selectedCustomers.includes(node.id)) {
          isSecondarySelected = true;
        } else if (!isPrimarySelected) {
          isDimmed = true;
        }
      }
    }
    
    let nodeR = 10;
    if (node.type === "customer" || node.type === "category") nodeR = 14;
    else if (node.type === "seller") nodeR = 12;
    else if (node.type === "product") {
       const ratio = node.originalDemand && node.originalDemand > 0 ? (node.demand / node.originalDemand) : 1;
       nodeR = Math.max(12, Math.min(20, 10 * Math.sqrt(ratio))); // Map scaling
    }

    const radius = isPrimarySelected ? nodeR + 4 : isSecondarySelected ? nodeR + 2 : nodeR;

    const fillStyle = node.type === "customer" ? "#10b981" : node.type === "seller" ? (node.isMe ? "#a855f7" : "#2563eb") : node.type === "product" ? "#f97316" : "#334155";
    
    ctx.globalAlpha = isDimmed ? 0.2 : 1;

    if (isPrimarySelected) {
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 20 / globalScale;
    } else if (isSecondarySelected) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15 / globalScale;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 8 / globalScale;
    }
    
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isPrimarySelected || isSecondarySelected ? 0 : 2 / globalScale;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.lineWidth = (isPrimarySelected || isSecondarySelected) ? 2.5 / globalScale : 1.5 / globalScale;
    ctx.strokeStyle = isPrimarySelected ? "#0f172a" : isSecondarySelected ? "#fbbf24" : "#ffffff";
    ctx.stroke();

    // Draw the actual icon
    const iconImg = iconCache[node.type];
    if (iconImg) {
      // For sharp SVG icons rendering on canvas, calculate dimension based on radius
      // padding inside the circle
      const iconSize = radius * 1.2; 
      ctx.drawImage(iconImg, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize);
    }

    if (globalScale > 1.2 || isPrimarySelected || isSecondarySelected) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
      
      ctx.fillStyle = `rgba(255, 255, 255, ${isDimmed ? 0.4 : 0.8})`;
      ctx.fillRect(
        node.x - bckgDimensions[0] / 2, 
        node.y + radius + 2 / globalScale, 
        bckgDimensions[0], 
        bckgDimensions[1]
      );

      ctx.fillStyle = isPrimarySelected ? '#0f172a' : isSecondarySelected ? '#b45309' : '#475569';
      ctx.fillText(label, node.x, node.y + radius + 2 / globalScale + fontSize * 0.1);
    }
    
    ctx.globalAlpha = 1;
  }, [selectedNodes]);

  useEffect(() => {
    if (selectedNodes.length > 1) {
      setShowTutorial(false);
    }
    
    if (selectedNodes.length > 0) {
      const typesPresent = Array.from(new Set(selectedNodes.map(n => n.type)));
      if (!typesPresent.includes(compType)) {
        setCompType(typesPresent[0] as any);
      }
    }
  }, [selectedNodes]);

  const handleNodeClick = (node: any, event: any) => {
    // Quan trọng: Phải copy node {...node} để React không làm hỏng object gốc của D3
    const safeNode = { ...node }; 
    
    if (multiSelectMode || event.shiftKey || event.metaKey || event.ctrlKey) {
      setSelectedNodes(prev => {
        const exists = prev.find(n => n.id === safeNode.id);
        if (exists) return prev.filter(n => n.id !== safeNode.id);
        return [...prev, safeNode];
      });
    } else {
      setSelectedNodes(prev => (prev.length === 1 && prev[0].id === safeNode.id ? [] : [safeNode]));
    }
    setPriceChange(0);
    setXaiMessage(null);
  };

  const runSimulation = () => {
    const primaryNode = selectedNodes[0];
    if (!primaryNode || primaryNode.type !== "product") return;

    const newPrice = primaryNode.price * (1 + priceChange / 100);
    const priceDiff = primaryNode.price - newPrice;
    const elasticityMultiplier = primaryNode.demandElasticity || 1.5;
    const demandChange = Math.floor(priceDiff * elasticityMultiplier + (Math.random() * 10 - 5));
    const newDemand = Math.max(0, primaryNode.originalDemand + demandChange);

    // --- PHẦN 1: CẬP NHẬT DỮ LIỆU ĐỒ THỊ (Giữ vx, vy để nảy đồ thị) ---
    const updatedProducts = graphData.products.map((p: any) =>
      p.id === primaryNode.id
        ? { ...p, price: newPrice, demand: newDemand, vx: (Math.random() - 0.5) * 250, vy: (Math.random() - 0.5) * 250 }
        : p,
    );

    const finalProducts = updatedProducts.map((p: any) => {
      if (p.id !== primaryNode.id && p.categoryId === primaryNode.categoryId) {
        const compDemandChange = -Math.floor(demandChange * 0.2);
        return { ...p, demand: Math.max(0, p.demand + compDemandChange), vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150 };
      }
      return p;
    });

    // Cập nhật Nodes trực tiếp để giữ ổn định vật lý
    graphData.nodes.forEach((n: any) => {
      if (n.type === "product") {
        const prod = finalProducts.find((p: any) => p.id === n.id);
        if (prod) { n.price = prod.price; n.demand = prod.demand; }
      }
    });

    // --- PHẦN 2: CẬP NHẬT SELLERS & CATEGORIES (Dùng .map để fix lỗi Compare Mode) ---
    const updatedSellers = graphData.sellers?.map((s: any) => {
      const sellerProducts = finalProducts.filter((p: any) => p.sellerId === s.id);
      return {
        ...s,
        productCount: sellerProducts.length,
        avgPrice: parseFloat((sellerProducts.reduce((acc: any, p: any) => acc + p.price, 0) / (sellerProducts.length || 1)).toFixed(2)),
        profit: Math.floor(sellerProducts.reduce((acc: any, p: any) => acc + (p.price * p.demand), 0) * 0.2)
      };
    });

    const updatedCategories = graphData.categories?.map((c: any) => {
      const catProducts = finalProducts.filter((p: any) => p.categoryId === c.id);
      return {
        ...c,
        productCount: catProducts.length,
        avgPrice: parseFloat((catProducts.reduce((acc: any, p: any) => acc + p.price, 0) / (catProducts.length || 1)).toFixed(2)),
        avgDemand: Math.floor(catProducts.reduce((acc: any, p: any) => acc + p.demand, 0) / (catProducts.length || 1))
      };
    });

    const updatedGraphData = { 
      ...graphData, 
      products: finalProducts,
      sellers: updatedSellers,
      categories: updatedCategories
    };
    
    setGraphData(updatedGraphData);
    
    setSelectedNodes(prev => prev.map(n => {
      if (n.type === 'product') return finalProducts.find((p: any) => p.id === n.id) || n;
      if (n.type === 'category') return updatedCategories?.find((c: any) => c.id === n.id) || n;
      if (n.type === 'seller') return updatedSellers?.find((s: any) => s.id === n.id) || n;
      return n;
    }));

    // --- PHẦN 3: LƯU LỊCH SỬ & HIỆU ỨNG ---
    const myUpdatedSeller = updatedSellers?.find((s: any) => s.isMe); 
    const myNewProfit = myUpdatedSeller ? myUpdatedSeller.profit : 0;

    // Lưu vào lịch sử với tên sản phẩm
    saveScenarioByName(`Chỉnh giá ${primaryNode.name}: $${newPrice.toFixed(2)}`, myNewProfit, newPrice);

    // Hiển thị thông báo và chạy hiệu ứng nảy đồ thị
    // XAI Explanation
    if (priceChange < 0) {
      setXaiMessage(`Price decreased by ${Math.abs(priceChange)}%. With price elasticity at ${elasticityMultiplier.toFixed(2)}, demand is predicted to increase by ~${demandChange} units. Competitors in '${primaryNode.categoryId}' will likely lose market share as buyers shift to this product.`);
    } else if (priceChange > 0) {
      setXaiMessage(`Price increased by ${priceChange}%. Because this product is price sensitive (elasticity ${elasticityMultiplier.toFixed(2)}), volume drops by ${Math.abs(demandChange)} units. Demand shifts toward competitors.`);
    } else {
      setXaiMessage(`No price change applied. Demand remains stable.`);
    }
    setTimeout(() => graphRef.current?.d3ReheatSimulation(), 50);
    
    setPriceChange(0);
  };

  const renderComparisonView = () => {
    const nodesToCompare = selectedNodes.filter(n => n.type === compType);
    
    if (nodesToCompare.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          Select at least one {compType} to compare.
        </div>
      );
    }

    const metrics = compType === "product"
      ? [
          { key: "demand", label: "Demand", color: "#3b82f6" },
          { key: "price", label: "Price ($)", color: "#10b981" },
          { key: "rating", label: "Rating", color: "#f59e0b" },
        ]
      : compType === "seller"
      ? [
          { key: "profit", label: "Profit ($)", color: "#10b981" },
          { key: "rating", label: "Rating", color: "#f59e0b" },
        ]
      : [
          { key: "productCount", label: "Products", color: "#8b5cf6" },
          { key: "avgPrice", label: "Avg Price ($)", color: "#10b981" },
          { key: "avgDemand", label: "Avg Demand", color: "#3b82f6" },
        ];

    // Ensure active metric is valid for current type
    const activeMetricObj = metrics.find(m => m.key === compMetric) || metrics[0];

    return (
      <div className="flex flex-col h-full bg-slate-50 relative flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white shadow-[0_4px_6px_-6px_rgba(0,0,0,0.1)] flex flex-col gap-3 shrink-0 z-20">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-md">
              <TrendingUp size={16} className="text-blue-500" /> Comparison
            </h3>
            <span className="text-xs font-semibold px-2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {selectedNodes.length} Selected
            </span>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            {["product", "seller", "category"].map((t) => (
              <button
                key={t}
                onClick={() => setCompType(t as any)}
                className={`flex-1 text-[11px] font-bold capitalize py-1 rounded-md transition-colors ${
                  compType === t
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setCompMetric(m.key)}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all border ${
                  activeMetricObj.key === m.key
                    ? `bg-slate-800 border-slate-800 text-white shadow-sm`
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 min-h-0">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm h-full flex flex-col">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {activeMetricObj.label} Chart
            </h4>
            <div className="flex-1 w-full relative min-h-[150px]">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={nodesToCompare} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} textAnchor="end" angle={-35} height={40} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Bar dataKey={activeMetricObj.key} fill={activeMetricObj.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleAddNewProduct = () => {
    if (!newProductForm.name || !newProductForm.categoryId) return;
    const mySeller = graphData.sellers.find((s: any) => s.isMe);
    if (!mySeller) return;

    const newProdId = `product-${Date.now()}`;
    
    // Lấy toạ độ của cửa hàng để sản phẩm mới sinh ra từ đúng vị trí đó (nhìn sẽ mượt hơn)
    const sellerD3Node = d3DataRef.current.nodes.find((n: any) => n.id === mySeller.id);
    const startX = sellerD3Node?.x || 0;
    const startY = sellerD3Node?.y || 0;

    const newProd = {
      id: newProdId,
      type: 'product',
      name: newProductForm.name,
      sellerId: mySeller.id,
      categoryId: newProductForm.categoryId,
      price: Number(newProductForm.price),
      rating: "0.0",
      demand: 500,
      originalDemand: 500,
      demandElasticity: 1.5,
      isNew: true,
      x: startX, // Khởi tạo tọa độ
      y: startY,
      vx: (Math.random() - 0.5) * 100, // Thêm lực đẩy nhẹ để node nảy ra
      vy: (Math.random() - 0.5) * 100
    };

    const ownsLink = { source: mySeller.id, target: newProdId, type: 'owns' };
    const belongsLink = { source: newProdId, target: newProductForm.categoryId, type: 'belongs_to' };

    const compLinks = graphData.products
       .filter((p: any) => p.categoryId === newProductForm.categoryId)
       .map((p: any) => ({ source: newProdId, target: p.id, type: 'competes_with' }));

    // QUAN TRỌNG NHẤT: Cập nhật Object reference mới cho d3DataRef để ForceGraph nhận diện
    d3DataRef.current = {
      nodes: [...d3DataRef.current.nodes, newProd],
      links: [...d3DataRef.current.links, ownsLink, belongsLink, ...compLinks]
    };

    // Cập nhật State cho UI
    setGraphData((prev: any) => ({
      ...prev,
      nodes: [...prev.nodes, newProd],
      products: [...prev.products, newProd],
      links: [...prev.links, ownsLink, belongsLink, ...compLinks]
    }));

    setShowAddProduct(false);
    setNewProductForm({ name: '', price: 100, categoryId: '' });
    
    // Đánh thức mô phỏng vật lý để vẽ node mới ngay lập tức
    setTimeout(() => graphRef.current?.d3ReheatSimulation(), 100);

    // Auto-save logic
    if (scenarioNameInput) {
       saveScenarioByName(scenarioNameInput);
    } else {
       saveScenarioByName("Tung sản phẩm mới: " + newProductForm.name);
    }
  };

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('retailAiTutorialCompleted', 'true');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Joyride
        key={tourKey}
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={runTour}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#f97316',
          },
        }}
        locale={{
          back: 'Quay lại',
          close: 'Đóng',
          last: 'Hoàn tất',
          next: 'Tiếp tục',
          skip: 'Bỏ qua',
        }}
      />

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <button 
                onClick={() => setShowAddProduct(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-1">Add New Product</h3>
                <p className="text-slate-500 text-sm mb-6">Add a new product to your store (Me) to simulate its impact.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Name</label>
                    <input 
                      type="text" 
                      value={newProductForm.name}
                      onChange={e => setNewProductForm({...newProductForm, name: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., Ultra Widget X"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Base Price ($)</label>
                      <input 
                        type="number" 
                        value={newProductForm.price}
                        onChange={e => setNewProductForm({...newProductForm, price: Number(e.target.value)})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                      <select 
                        value={newProductForm.categoryId}
                        onChange={e => setNewProductForm({...newProductForm, categoryId: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                      >
                        <option value="" disabled>Select Category</option>
                        {graphData.categories.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1"><Save size={12}/> Scenario Name (Auto-save)</label>
                    <input 
                      type="text" 
                      value={scenarioNameInput}
                      onChange={e => setScenarioNameInput(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-slate-50"
                      placeholder="e.g. Tung sản phẩm mới..."
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={handleAddNewProduct}
                    disabled={!newProductForm.name || !newProductForm.categoryId}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    Launch Product
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md">
            <Network size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Graph Retail AI</h1>
            <p className="text-sm text-slate-500 font-medium">Competitive Intelligence & Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 compare-mode-toggle">
            <div className="text-right d-none sm:block">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compare Mode</p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Select multiple nodes easily</p>
            </div>
            <button 
              onClick={() => {
                setMultiSelectMode(!multiSelectMode);
                setShowTutorial(false);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${multiSelectMode ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${multiSelectMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button 
            onClick={() => setShowAddProduct(true)}
            className="add-product-btn flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg text-sm font-bold transition-colors border border-emerald-200"
          >
            <PlusCircle size={16} /> Add Product
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => {
              setTourKey(prev => prev + 1);
              setRunTour(true);
            }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
            title="Start Interactive Tutorial"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex w-full h-[calc(100vh-80px)]">
          {/* Left Panel: Graph Visualization */}
          <div className="flex-1 border-r border-slate-200 relative bg-white graph-container" ref={containerRef}>
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-xl shadow-lg network-legend">
              <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Network Legend</h3>
              <div className="flex flex-col gap-3 text-sm text-slate-600 font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-purple-500 shadow-sm"></div> Me (My Store)
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-600 shadow-sm"></div> Competitors (Sellers)
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm"></div> Products
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-slate-800 shadow-sm"></div> Categories
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm"></div> Customer Segments
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-6 h-[2px] bg-slate-300"></div> Owns / Belongs To / Targets
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-[2px] bg-slate-300 border-t-2 border-dashed"></div> Competes With
                </div>
              </div>
            </div>

            <div className="w-full h-full cursor-crosshair absolute inset-0">
              <ErrorBoundary>
                <ForceGraph2D
                  ref={graphRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  graphData={d3DataRef.current}
                  nodeCanvasObject={nodeCanvasObject}
                  nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    ctx.fillStyle = color;
                    const nodeR = node.type === "customer" ? 14 : node.type === "category" ? 14 : node.type === "seller" ? 12 : 10;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeR + 6, 0, 2 * Math.PI, false);
                    ctx.fill();
                  }}
                  linkColor={(link: any) => {
                    let isLinkDimmed = false;
                    let isLinkHighlighted = false;
                    let isCompHighlight = false;

                    if (selectedNodes.length > 0) {
                      if (selectedNodes[0].type === 'seller') {
                        const sellerId = selectedNodes[0].id;
                        const sellerProducts = graphData.products.filter(p => p.sellerId === sellerId);
                        const isSellerProductLink = link.type === 'owns' && link.source.id === sellerId;
                        const isSellerCatLink = link.type === 'belongs_to' && sellerProducts.some(p => p.id === link.source.id);
                        const isSellerCusLink = link.type === 'targets' && sellerProducts.some(p => p.id === link.source.id);
                        
                        if (isSellerProductLink || isSellerCatLink || isSellerCusLink) {
                           isLinkHighlighted = true;
                        } else {
                           isLinkDimmed = true;
                        }
                      } else {
                        const selectedProducts = selectedNodes.filter(n => n.type === 'product');
                        
                        const isCatLink = selectedProducts.some(sn => 
                          (link.source.id === sn.id && link.target.id === sn.categoryId) || 
                          (link.target.id === sn.id && link.source.id === sn.categoryId) ||
                          (link.source.id === sn.id && link.target.id === sn.targetCustomerId) ||
                          (link.target.id === sn.id && link.source.id === sn.targetCustomerId)
                        );
                        const isCompLink = link.type === 'competes_with' && selectedProducts.some(sn => 
                          link.source.id === sn.id || link.target.id === sn.id
                        );
                        
                        if (isCatLink) isLinkHighlighted = true;
                        else if (isCompLink) isCompHighlight = true;
                        else isLinkDimmed = true;
                      }
                    }
                    
                    if (isLinkHighlighted) return "rgba(249, 115, 22, 0.8)";
                    if (isCompHighlight) return "rgba(245, 158, 11, 0.8)";
                    if (isLinkDimmed) return link.type === "competes_with" ? "rgba(203, 213, 225, 0.15)" : "rgba(148, 163, 184, 0.2)";
                    
                    return link.type === "competes_with" ? "rgba(203, 213, 225, 0.6)" : "rgba(148, 163, 184, 0.8)";
                  }}
                  linkWidth={(link: any) => (link.type === "competes_with" ? 1 : 1.5)}
                  linkLineDash={(link: any) =>
                    link.type === "competes_with" ? [4, 4] : []
                  }
                  linkDirectionalParticles={(link: any) => link.type === 'owns' ? 2 : 0}
                  linkDirectionalParticleWidth={1.5}
                  linkDirectionalParticleSpeed={0.005}
                  linkDirectionalParticleColor={() => "#2563eb"}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={() => {
                    setSelectedNodes([]);
                    setPriceChange(0);
                    setXaiMessage(null);
                  }}
                  backgroundColor="#f8fafc" // slate-50
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Right Panel: Controls & Metrics */}
          <div className="w-[380px] bg-slate-50 flex flex-col shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 shrink-0 intelligence-dashboard">
            {/* 1. Global Scenario Top Area (Compact & Always Visible) */}
            <div className="p-3 border-b border-slate-200 bg-white shrink-0 shadow-sm z-20">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe size={16} /> Market Scenarios
                </h2>
                <div className="flex gap-1.5">
                  <button title="Khôi phục trạng thái gốc" onClick={resetSimulation} className="text-[10px] uppercase font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 py-1.5 px-2 rounded flex items-center gap-1 transition-colors group">
                    <RotateCcw size={12} className="group-hover:-rotate-90 transition-transform duration-300"/> Khôi phục gốc
                  </button>
                  <button onClick={optimizeMyProfit} className="text-[10px] uppercase font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 py-1.5 px-2 rounded flex items-center gap-1 transition-colors">
                    <BrainCircuit size={12}/> Auto Optimize
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <select 
                  className="flex-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold px-2 py-1.5 outline-none text-slate-700 focus:border-blue-500"
                  value={marketCondition}
                  onChange={(e) => applyMarketCondition(e.target.value as any)}
                >
                  <option value="normal">Economy: Normal</option>
                  <option value="growth">Economy: Growth</option>
                  <option value="recession">Economy: Recession</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Save size={12} className="absolute left-2.5 top-2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 rounded text-xs pl-7 pr-2 py-1.5 outline-none placeholder:text-slate-400 focus:border-blue-500"
                    placeholder="Scenario name..."
                    value={scenarioNameInput}
                    onChange={e => setScenarioNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveScenario()}
                  />
                </div>
                <button 
                  onClick={saveScenario}
                  className="bg-slate-800 hover:bg-black text-white text-[11px] px-3 py-1.5 font-bold rounded transition-colors"
                >
                  Save
                </button>
              </div>

              {savedScenarios.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 max-h-24 overflow-y-auto pr-1 border-t border-slate-100 pt-2">
                  {savedScenarios.map((sc) => (
                    <div key={sc.id} className="flex justify-between items-center bg-white/60 p-2 mb-1 rounded border border-slate-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-[11px]">{sc.name}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{sc.condition}</span>
                      </div>
                      <div className="text-right">
                        {/* Dòng 1: Hiện giá (Con số nhỏ) */}
                        {sc.price && (
                          <div className="text-[10px] font-bold text-blue-600">
                            Giá: ${sc.price.toFixed(2)}
                          </div>
                        )}
                        {/* Dòng 2: Hiện lợi nhuận (Con số lớn) */}
                        <div className="text-[11px] font-mono font-black text-slate-800">
                          Lãi: ${sc.profit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Node Context Info (Flex 1) */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {selectedNodes.length === 1 ? (
                <div className="p-4 flex flex-col gap-4">
                  {/* Node Info block */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-slate-900 line-clamp-1 mr-2">{selectedNodes[0].name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                        selectedNodes[0].type === 'seller' ? 'bg-blue-100 text-blue-700' : 
                        selectedNodes[0].type === 'product' ? 'bg-orange-100 text-orange-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedNodes[0].type}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-sm">
                      {selectedNodes[0].type === 'product' ? (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Price</p>
                          <p className="font-mono text-base font-bold text-slate-900">${selectedNodes[0].price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Rating</p>
                          <p className="font-mono text-base font-bold text-slate-900 flex items-center gap-1">
                            {selectedNodes[0].rating} <span className="text-orange-400 text-sm">★</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Demand</p>
                          <p className="font-mono text-base font-bold text-blue-600">{selectedNodes[0].originalDemand}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Elasticity</p>
                          <p className="font-mono text-base font-bold text-slate-900">{selectedNodes[0].demandElasticity?.toFixed(2) || '1.50'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Category</p>
                          <p className="font-mono text-xs font-semibold py-0.5 px-1.5 bg-slate-100 rounded text-slate-700 inline-block">{selectedNodes[0].categoryId}</p>
                        </div>
                      </>
                    ) : selectedNodes[0].type === 'seller' ? (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Profit</p>
                          <p className="font-mono text-base font-bold text-emerald-600">${selectedNodes[0].profit?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Rating</p>
                          <p className="font-mono text-base font-bold text-slate-900 flex items-center gap-1">
                            {selectedNodes[0].rating} <span className="text-orange-400 text-sm">★</span>
                          </p>
                        </div>
                      </>
                    ) : selectedNodes[0].type === 'category' ? (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Avg Demand</p>
                          <p className="font-mono text-base font-bold text-blue-600">{selectedNodes[0].avgDemand}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Avg Price</p>
                          <p className="font-mono text-base font-bold text-emerald-600">${selectedNodes[0].avgPrice?.toFixed(2)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Target Products</p>
                          <p className="font-mono text-base font-bold text-blue-600">{selectedNodes[0].productCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Pref. Avg Price</p>
                          <p className="font-mono text-base font-bold text-emerald-600">${selectedNodes[0].avgPricePref?.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Simulation & XAI Panel for Single Product */}
                {selectedNodes[0].type === 'product' && (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="bg-blue-50 p-2.5 border-b border-blue-100 flex items-start gap-2 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Activity size={12} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Price XAI Engine</h4>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Adjust price to forecast market shifts.</p>
                      </div>
                    </div>
                    
                    <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 h-full min-h-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Price Adjustment</span>
                        <span className={`font-mono font-bold ${priceChange > 0 ? "text-emerald-600" : priceChange < 0 ? "text-rose-500" : "text-slate-500"}`}>
                          {priceChange > 0 ? "+" : ""}{priceChange}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={priceChange}
                        onChange={(e) => setPriceChange(Number(e.target.value))}
                        className="w-full h-1.5 accent-blue-600 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1"><Save size={10}/> Scenario Name</label>
                        <input 
                          type="text" 
                          value={scenarioNameInput}
                          onChange={e => setScenarioNameInput(e.target.value)}
                          className="w-full border border-slate-300 rounded overflow-hidden px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                          placeholder="e.g. Giảm giá để canh tranh..."
                        />
                      </div>
                      <button
                        onClick={runSimulation}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors shadow-sm shrink-0"
                      >
                        <Play size={14} /> Run Forecast
                      </button>

                      {xaiMessage && (
                        <div className="mt-1 text-[11px] p-2 rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white text-indigo-900 leading-tight shadow-inner">
                          <div className="flex items-center gap-1.5 font-bold mb-1 text-indigo-800">
                            <BrainCircuit size={12} /> XAI Insight
                          </div>
                          {xaiMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedNodes.length > 1 ? (
              <div className="h-full">
                {renderComparisonView()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <Network size={32} className="text-slate-300" />
                </div>
                <p className="font-medium text-slate-500 text-sm">Click on a node in the graph to view intelligence.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>

    {/* Chatbot Integration */}
      <Chatbot 
        selectedNode={selectedNodes[0] || null} 
        simulationHistory={[]} 
        graphData={graphData} 
      />
    </div>
  );
}