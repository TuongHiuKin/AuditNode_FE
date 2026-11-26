import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { ExternalServiceNode } from "@/features/dependency-graph/components/ExternalServiceNode";
import type { PaletteExternalService } from "@/features/dependency-graph/types";

const service: PaletteExternalService = {
  id: "stripe-1",
  name: "Stripe",
  kind: "payment",
  provider: "Stripe",
  endpoint: "https://api.stripe.com",
  port: 443,
  environment: "Production",
  dependentApplicationCount: 2,
};

function renderNode(data: { service: PaletteExternalService }) {
  return render(
    <ReactFlowProvider>
      <ExternalServiceNode
        id="external-stripe-1"
        type="externalServiceNode"
        data={data}
        selected={false}
        isConnectable
        zIndex={1}
        dragging={false}
        draggable
        selectable
        deletable
        positionAbsoluteX={0}
        positionAbsoluteY={0}
      />
    </ReactFlowProvider>,
  );
}

describe("ExternalServiceNode", () => {
  it("shows the service name, kind and endpoint so it reads as third-party", () => {
    renderNode({ service });
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.getByText(/payment/)).toBeInTheDocument();
    expect(screen.getByText(/api\.stripe\.com/)).toBeInTheDocument();
  });

  it("omits the endpoint line when the service has neither endpoint nor port", () => {
    renderNode({ service: { ...service, endpoint: null, port: null } });
    expect(screen.queryByText(/api\.stripe\.com/)).not.toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });
});
