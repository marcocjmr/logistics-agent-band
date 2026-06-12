# Proyecto Hackathon Band of Agents: Orquestador de Logística y Reubicación Corporativa

## 1. Contexto del Proyecto
*   **Evento:** Band of Agents Hackathon (lablab.ai)
*   **Track Seleccionado:** Track 1 - Internal Enterprise Workflows
*   **Plazo de Entrega:** 19 de junio de 2026 (10:00 AM CST)

## 2. Definición del Problema
En entornos corporativos grandes, coordinar viajes de negocios complejos que involucran múltiples destinos y estancias prolongadas es un proceso manual, lento y propenso a errores. Requiere cruzar constantemente correos y aprobaciones entre el empleado, recursos humanos y el departamento financiero. Esto genera cuellos de botella y dificulta garantizar el cumplimiento de las políticas de viáticos de la empresa de manera ágil.

## 3. Solución Planteada
Desarrollar un sistema multi-agente autónomo que consolide, planifique y apruebe itinerarios corporativos complejos sin intervención humana en las etapas intermedias. 

El sistema utilizará la plataforma Band como capa central de colaboración y transferencia de contexto estructurado entre agentes especializados. La ventaja competitiva del proyecto radicará en su presentación y diseño (UI/UX), haciendo que la comunicación subyacente entre las IAs sea visualmente comprensible y enfocada en el flujo empresarial.

## 4. Arquitectura de Agentes
El flujo de trabajo se divide en cuatro agentes con responsabilidades aisladas para evitar alucinaciones y mantener un control estricto de las tareas:

1.  **Agente de Ingesta (Requirements Analyst):** 
    *   Recibe la solicitud no estructurada del usuario en lenguaje natural.
    *   Extrae fechas, ciudades y propósito del viaje.
    *   Formatea la información en un objeto JSON estructurado y lo inyecta a la sala de comunicación de Band.
2.  **Agente de Movilidad (Transit Planner):**
    *   Lee el JSON de requerimientos a través de Band.
    *   Simula la búsqueda y selección de rutas aéreas y terrestres óptimas entre los destinos solicitados, priorizando la eficiencia del tiempo de traslado.
3.  **Agente de Alojamiento (Accommodation Scout):**
    *   Opera en paralelo o secuencialmente utilizando los datos de las ciudades de destino.
    *   Selecciona opciones de estadía que cumplan con estándares corporativos y cercanía a las zonas de trabajo requeridas.
4.  **Agente de Cumplimiento (Financial Auditor):**
    *   Consolida las propuestas del Transit Planner y el Accommodation Scout.
    *   Evalúa los costos totales contra un presupuesto simulado de la empresa.
    *   Si aprueba, genera el reporte final del itinerario. Si rechaza, envía un mensaje estructurado por Band solicitando a los agentes previos opciones más económicas, forzando una re-planificación autónoma.

## 5. Visión de UI/UX (Frontend)
El objetivo principal de la interfaz es hacer visible la colaboración. Se diseñará un dashboard dividido en dos secciones principales:
*   **Panel Izquierdo (Consola de Orquestación):** Un registro visual interactivo donde se observa el intercambio de datos estructurados y mensajes de estado entre los cuatro agentes a través de la red de Band en tiempo real.
*   **Panel Derecho (Resultados Visuales):** Un componente dinámico (timeline de eventos) que se va poblando con tarjetas visuales de vuelos, hoteles y estados de aprobación a medida que los agentes llegan a un consenso final.

## 6. Stack Tecnológico Sugerido
*   **Capa de Colaboración:** Band SDK (Requisito central del hackathon para comunicación entre agentes).
*   **Modelos de Inferencia:** AI/ML API o Featherless AI (Aprovechando créditos de patrocinadores).
*   **Frontend:** Next.js y React para maquetar el dashboard de doble panel de manera rápida y estructurada.
*   **Instrucciones para el Copiloto:** Asistir primariamente en la configuración del boilerplate de Next.js, el enrutamiento de la API de Band y la generación de componentes visuales limpios, permitiendo al desarrollador enfocarse en la orquestación lógica del sistema.
