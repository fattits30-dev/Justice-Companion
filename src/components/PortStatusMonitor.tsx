import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface PortStatus {
  port: number;
  service: string;
  inUse: boolean;
  allocatedAt?: string;
}

interface PortAllocation {
  [service: string]: number;
}

interface PortMonitorData {
  timestamp: string;
  allocatedPorts: PortAllocation;
  portStatus: PortStatus[];
  environment: Record<string, string>;
}

/**
 * Component for monitoring and displaying port status
 */
export const PortStatusMonitor: React.FC = () => {
  const [portData, setPortData] = useState<PortMonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPortStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call IPC to get port status from main process
      const result = await window.portApi?.getPortStatus();

      if (result && result.success) {
        setPortData(result.data || null);
      } else {
        setError(result?.error || "Failed to fetch port status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPortStatus();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchPortStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (inUse: boolean) => {
    if (inUse) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (inUse: boolean) => {
    if (inUse) {
      return <Badge variant="success">Active</Badge>;
    }
    return <Badge variant="danger">Inactive</Badge>;
  };

  const formatPort = (port: number) => {
    return port.toString().padStart(5, " ");
  };

  const formatServiceName = (service: string) => {
    return service
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading && !portData) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2">Loading port status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-500">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error: {error}</span>
        </div>
        <Button onClick={fetchPortStatus} className="mt-4" variant="secondary">
          Retry
        </Button>
      </Card>
    );
  }

  if (!portData) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Server className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold">Port Status Monitor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchPortStatus}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {/* Allocated Ports Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Allocated Ports
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Port</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Environment Variable</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {Object.entries(portData.allocatedPorts).map(
                  ([service, port]) => {
                    const status = portData.portStatus.find(
                      (s) => s.port === port,
                    );
                    const envVar =
                      service.toUpperCase().replace(/-/g, "_") + "_PORT";

                    return (
                      <tr key={service} className="border-t border-gray-200">
                        <td className="py-2">
                          <div className="flex items-center">
                            {getStatusIcon(status?.inUse || false)}
                            <span className="ml-2">
                              {formatServiceName(service)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 font-mono">{formatPort(port)}</td>
                        <td className="py-2">
                          {getStatusBadge(status?.inUse || false)}
                        </td>
                        <td className="py-2 font-mono text-xs text-gray-600">
                          {envVar}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Port Configuration */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Allocated:</span>
              <span className="ml-2 font-medium">
                {Object.keys(portData.allocatedPorts).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Active Ports:</span>
              <span className="ml-2 font-medium">
                {portData.portStatus.filter((p) => p.inUse).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Environment:</span>
              <span className="ml-2 font-medium">
                {process.env.NODE_ENV || "development"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <span className="ml-2 font-medium">
                {new Date(portData.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700 font-medium mb-2">
            Environment Variables
          </summary>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
            {Object.entries(portData.environment).map(([key, value]) => (
              <div key={key} className="py-1">
                <span className="text-blue-600">{key}</span>
                <span className="text-gray-600">=</span>
                <span className="text-green-600">{value}</span>
              </div>
            ))}
          </div>
        </details>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={async () => {
              try {
                const result = await window.portApi?.restartServices();
                if (result && result.success) {
                  await fetchPortStatus();
                } else {
                  setError("Failed to restart services");
                }
              } catch (err) {
                setError("Failed to restart services");
              }
            }}
            variant="secondary"
            size="sm"
          >
            Restart Services
          </Button>
          <Button
            onClick={async () => {
              try {
                const result = await window.portApi?.releaseAllPorts();
                if (result && result.success) {
                  await fetchPortStatus();
                } else {
                  setError("Failed to release ports");
                }
              } catch (err) {
                setError("Failed to release ports");
              }
            }}
            variant="ghost"
            size="sm"
          >
            Release All Ports
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PortStatusMonitor;
