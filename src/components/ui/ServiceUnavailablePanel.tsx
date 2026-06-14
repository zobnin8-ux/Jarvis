"use client";

import { serviceUnavailableMessage } from "@/lib/serviceLabels";

interface ServiceUnavailablePanelProps {
  service: string;
  className?: string;
}

export function ServiceUnavailablePanel({
  service,
  className = "",
}: ServiceUnavailablePanelProps) {
  return (
    <div
      className={`service-unavailable panel-glow rounded-lg border border-white/10 bg-black/20 p-5 md:p-6 ${className}`}
      role="status"
    >
      <div className="label text-white/35">Статус</div>
      <p className="service-unavailable-text mt-2">
        {serviceUnavailableMessage(service)}
      </p>
    </div>
  );
}
