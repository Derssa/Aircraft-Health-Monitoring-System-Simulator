# Aircraft Health Monitoring System Simulator

A production-style, event-driven microservice architecture simulating an Aircraft Health Monitoring System (AHMS). This project demonstrates a complete real-time telemetry pipeline, from sensor simulation to live visualization.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["External Access (Public Port 80)"]
        UI[React Dashboard]
        Proxy[Nginx Reverse Proxy]
    end

    subgraph EdgeLayer["Edge (Aircraft Simulation)"]
        SS[Sensor Simulator]
    end

    subgraph KafkaLayer["Event Streaming (Kafka)"]
        KR{{"telemetry.raw"}}
        KV{{"telemetry.validated"}}
        KA{{"alerts"}}
    end

    subgraph LogicLayer["Backend Microservices"]
        TIS[Telemetry Ingestion Service]
        VS[Validation Service]
    end

    subgraph DataLayer["Storage & Gateway"]
        PG[(PostgreSQL)]
        API[API Gateway]
    end

    %% Routing
    Proxy -- "/" --> UI
    Proxy -- "/api" --> API

    %% Pipeline
    SS -- "Produces" --> KR
    KR -- "Consumed by" --> TIS
    
    TIS -- "Produces" --> KV
    TIS -- "Writes" --> PG
    
    KV -- "Consumed by" --> VS
    VS -- "Produces" --> KA
    VS -- "Writes" --> PG
    
    KA -- "Consumed by Dashboard (via SSE/WS)" -.-> UI
    
    PG -. "Queries" .-> API
```

## System Components

1.  **Nginx Reverse Proxy**: The single entry point for the system. It routes traffic to the Dashboard or the API Gateway based on the URL path. It ensures internal services like Kafka and Postgres are not exposed.
2.  **Sensor Simulator (`sensor-simulator`)**: Simulates aircraft flight data (Temp, Vibration, Pressure).
    *   **Role**: **Producer**
    *   **Logic**: Generates 1Hz telemetry and sends JSON payloads to `telemetry.raw`.
3.  **Telemetry Ingestion (`telemetry-ingestion-service`)**:
    *   **Role**: **Consumer & Producer**
    *   **Logic**: Consumes from `telemetry.raw`. Validates data using Zod. If valid, writes to PostgreSQL and **produces** to `telemetry.validated`.
    *   **Retention**: Every 5 minutes, it purges data older than 1 hour from the DB.
4.  **Validation Service (`validation-service`)**:
    *   **Role**: **Consumer & Producer**
    *   **Logic**: Consumes from `telemetry.validated`. Runs analysis (e.g., Simple Moving Averages) to detect anomalies. If an issue is found, it **produces** an event to `alerts` and writes it to the DB.
5.  **API Gateway (`api-gateway`)**: Serves historical data and current aircraft status to the dashboard.
6.  **Dashboard (`dashboard`)**: Real-time visualization of engine health and active alerts.

## Kafka Event Pipeline

The system follows a "pipes and filters" pattern using Kafka topics:

| Topic | Producer | Consumer | Purpose |
| :--- | :--- | :--- | :--- |
| `telemetry.raw` | Sensor Simulator | Ingestion Service | High-volume stream of raw aircraft data. |
| `telemetry.validated` | Ingestion Service | Validation Service | Cleaned, schema-checked data ready for analysis. |
| `alerts` | Validation Service | Dashboard / Notifications | Critical anomalies (Overheat, High Vibration, Drift). |

## Tech Stack
- **Node.js (TypeScript)**: Core microservice runtime.
- **Apache Kafka**: Real-time event broker.
- **PostgreSQL**: Time-series storage for telemetry and alerts.
- **Nginx**: Reverse proxy and load balancer.
- **React + Vite**: UI layer.
- **Docker & Docker Compose**: Infrastructure automation.

## Running Locally

1.  **Prerequisites**: Docker and Docker Compose installed.
2.  **Boot**: Run `docker-compose up --build`
3.  **Access**: Open [http://localhost](http://localhost) (Nginx handles the routing).
4.  **Clean up**: Run `docker-compose down -v` to wipe data and containers.
