import { useRef, useEffect } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  central: boolean;
  ox?: number;
  oy?: number;
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function initNodes() {
      const nodes: Node[] = [];
      const count = Math.min(80, Math.floor((canvas!.width * canvas!.height) / 12000));

      // Central node (XKI)
      nodes.push({
        x: canvas!.width / 2,
        y: canvas!.height / 2 - 40,
        vx: 0,
        vy: 0,
        r: 6,
        central: true,
        ox: canvas!.width / 2,
        oy: canvas!.height / 2 - 40,
      });

      // Satellite nodes
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 2 + 1,
          central: false,
        });
      }

      nodesRef.current = nodes;
    }

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      canvas!.width = parent.offsetWidth;
      canvas!.height = parent.offsetHeight;
      initNodes();
    }

    function draw() {
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Update positions
      nodes.forEach((n) => {
        if (n.central) {
          n.x = n.ox! + Math.sin(Date.now() * 0.001) * 3;
          n.y = n.oy! + Math.cos(Date.now() * 0.0008) * 3;
          return;
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas!.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas!.height) n.vy *= -1;

        // Mouse repulsion
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          n.vx += (dx / dist) * 0.05;
          n.vy += (dy / dist) * 0.05;
        }
        n.vx *= 0.999;
        n.vy *= 0.999;
      });

      // Draw connections
      const central = nodes[0];
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = central.x - n.x;
        const dy = central.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 300;
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.15;
          ctx!.beginPath();
          ctx!.moveTo(central.x, central.y);
          ctx!.lineTo(n.x, n.y);
          ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.lineWidth = 0.5;
          ctx!.stroke();

          // Particle traveling along line
          const t = ((Date.now() * 0.001 + i) % 3) / 3;
          const px = n.x + (central.x - n.x) * t;
          const py = n.y + (central.y - n.y) * t;
          ctx!.beginPath();
          ctx!.arc(px, py, 1, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha * 2})`;
          ctx!.fill();
        }

        // Inter-node connections
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const d = Math.hypot(n.x - n2.x, n.y - n2.y);
          if (d < 120) {
            ctx!.beginPath();
            ctx!.moveTo(n.x, n.y);
            ctx!.lineTo(n2.x, n2.y);
            ctx!.strokeStyle = `rgba(255, 255, 255, ${(1 - d / 120) * 0.04})`;
            ctx!.lineWidth = 0.3;
            ctx!.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        if (n.central) {
          ctx!.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx!.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx!.shadowBlur = 20;
        } else {
          ctx!.fillStyle = `rgba(255, 255, 255, ${0.1 + n.r * 0.1})`;
          ctx!.shadowBlur = 0;
        }
        ctx!.fill();
        ctx!.shadowBlur = 0;
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const parent = canvas.parentElement;
    parent?.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resize);

    resize();
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      parent?.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-canvas" />;
}
