import { describe, expect, it } from "vitest";
import { oficioId, sugerirCertificaciones } from "@/lib/dashboard/courses";

type Perfil = Parameters<typeof sugerirCertificaciones>[0];

const perfil = (over: Partial<Perfil> = {}): Perfil => ({
  oficio_principal: { nombre: "albañil", tiempo_experiencia: "3_a_10", tiene_herramientas: "tiene" },
  oficios_secundarios: [],
  busqueda_laboral: "empleo",
  historial_laboral: { trabajos_anteriores: [] },
  negocio_propio: { tuvo_negocio: false },
  validacion_tecnica_ia: {},
  ...over,
});

describe("oficioId", () => {
  it("reconoce oficios del banco y fuera de él", () => {
    expect(oficioId("Albañil")).toBe("masonry");
    expect(oficioId("plomero")).toBe("plumbing");
    expect(oficioId("ayudante de cocina")).toBe("cooking");
    expect(oficioId("astronauta")).toBeNull();
  });
});

describe("sugerirCertificaciones", () => {
  it("usa los años declarados si no hubo evaluación", () => {
    const [c] = sugerirCertificaciones(perfil());
    expect(c).toMatchObject({ titulo: "Albañilería y frisos", nivel: "medio" });
    expect(c.motivo).toContain("3 a 10 años");
  });

  it("el nivel demostrado pesa más que los años", () => {
    const [c] = sugerirCertificaciones(perfil({
      validacion_tecnica_ia: { evaluacion_detallada: { nivel_demostrado: "experto" } as never },
    }));
    expect(c.nivel).toBe("avanzado");
  });

  it("suma oficios secundarios, trabajos anteriores y emprendimiento sin repetir", () => {
    const titulos = sugerirCertificaciones(perfil({
      oficios_secundarios: ["pintor", "albañil"],
      historial_laboral: { trabajos_anteriores: ["electricista"] },
      busqueda_laboral: "independiente",
    })).map((c) => c.titulo);
    expect(titulos).toEqual([
      "Albañilería y frisos", "Pintura de obra y acabados",
      "Instalaciones eléctricas residenciales", "Emprendimiento y finanzas para tu oficio",
    ]);
  });

  it("sin oficio ofrece formación inicial", () => {
    const cs = sugerirCertificaciones(perfil({ oficio_principal: { nombre: "sin_oficio", tiempo_experiencia: "sin_dato", tiene_herramientas: "sin_dato" } }));
    expect(cs.every((c) => c.nivel === "principiante")).toBe(true);
  });

  it("oficio vacío no inventa una certificación", () => {
    expect(sugerirCertificaciones(perfil({ oficio_principal: { nombre: "", tiempo_experiencia: "10 meses", tiene_herramientas: "" } }))).toEqual([]);
  });

  it("oficio desconocido igual recibe una certificación genérica", () => {
    const [c] = sugerirCertificaciones(perfil({ oficio_principal: { nombre: "tapicero", tiempo_experiencia: "1_a_3", tiene_herramientas: "tiene" } }));
    expect(c.titulo).toBe("Certificación en tapicero");
  });
});
