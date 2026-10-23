import os
import sys
import socket
import subprocess
import time
import uvicorn

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Checks whether a port is already bound on the specified host."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True


def get_pids_on_port(port: int):
    """Finds list of (pid, process_name) listening on the given port on Windows."""
    try:
        cmd = f"netstat -ano | findstr :{port}"
        output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        pids = set()
        for line in output.strip().splitlines():
            if "LISTENING" in line.upper():
                parts = line.strip().split()
                if len(parts) >= 5:
                    pid_str = parts[-1]
                    if pid_str.isdigit() and int(pid_str) != os.getpid():
                        pids.add(int(pid_str))

        results = []
        for pid in pids:
            try:
                name_out = subprocess.check_output(
                    f'tasklist /FI "PID eq {pid}" /NH /FO CSV',
                    shell=True,
                    text=True,
                    stderr=subprocess.DEVNULL,
                )
                name = name_out.strip().split(",")[0].strip('"') if name_out.strip() else "unknown"
                results.append((pid, name))
            except Exception:
                results.append((pid, "unknown"))
        return results
    except Exception:
        return []


def terminate_stale_process(port: int) -> bool:
    """Attempts to safely terminate stale Python processes listening on the port."""
    processes = get_pids_on_port(port)
    if not processes:
        return False

    terminated = False
    for pid, name in processes:
        name_lower = name.lower()
        # Only terminate python or uvicorn processes to protect system services
        if "python" in name_lower or "uvicorn" in name_lower or name_lower == "unknown":
            print(f"[CLEANUP] Found stale process {name} (PID: {pid}) holding port {port}. Terminating...")
            try:
                subprocess.run(
                    f"taskkill /F /PID {pid}",
                    shell=True,
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                terminated = True
            except Exception as e:
                print(f"[WARNING] Could not terminate PID {pid}: {e}")

    if terminated:
        # Wait up to 3 seconds for OS socket release
        for _ in range(6):
            time.sleep(0.5)
            if not is_port_in_use(port):
                print(f"[SUCCESS] Port {port} freed successfully.")
                return True

    return not is_port_in_use(port)


def update_frontend_api_port(new_port: int):
    """Synchronizes frontend .env when a fallback port is used."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        frontend_env = os.path.join(base_dir, "frontend", ".env")
        if os.path.exists(frontend_env):
            with open(frontend_env, "r", encoding="utf-8") as f:
                content = f.read()
            new_line = f"VITE_API_URL=http://127.0.0.1:{new_port}\n"
            if "VITE_API_URL=" in content:
                import re
                content = re.sub(r"VITE_API_URL=.*", f"VITE_API_URL=http://127.0.0.1:{new_port}", content)
            else:
                content += new_line
            with open(frontend_env, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"[SYNC] Updated frontend/.env -> VITE_API_URL=http://127.0.0.1:{new_port}")
    except Exception as e:
        print(f"[WARNING] Could not sync frontend .env: {e}")


def resolve_available_port(target_port: int, host: str) -> int:
    """Ensures an available port is returned, safely freeing stale processes or falling back."""
    # 1. Check if the target port is immediately available
    if not is_port_in_use(target_port, host):
        return target_port

    print(f"[PORT CHECK] Port {target_port} is currently occupied.")

    # 2. Try to free stale python processes
    if terminate_stale_process(target_port):
        return target_port

    # 3. If port is genuinely unavailable, select next fallback port (e.g. 8001, 8002)
    for fallback in [8001, 8002, 8080]:
        if not is_port_in_use(fallback, host):
            print(f"[PORT SWITCH] Port {target_port} is busy. Automatically switching to free port {fallback}.")
            update_frontend_api_port(fallback)
            return fallback

    return target_port


if __name__ == "__main__":
    # Prefer 127.0.0.1 on Windows development to prevent socket access permission errors
    host = os.environ.get("HOST", "127.0.0.1")
    configured_port = int(os.environ.get("PORT", 8000))
    reload_enabled = "--reload" in sys.argv or os.environ.get("RELOAD", "true").lower() in ("true", "1", "yes")

    active_port = resolve_available_port(configured_port, host)
    update_frontend_api_port(active_port)

    print("=" * 60)
    print(" EventSphere Backend Server Starting")
    print(f" Host:         {host}")
    print(f" Port:         {active_port}")
    print(f" Server URL:   http://{host}:{active_port}")
    print(f" Swagger Docs: http://{host}:{active_port}/docs")
    print("=" * 60)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=active_port,
        reload=reload_enabled,
        log_level=os.environ.get("LOG_LEVEL", "info").lower(),
        access_log=True,
    )
