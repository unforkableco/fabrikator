### OpenSCAD Workspace

This folder contains tooling to install OpenSCAD, the BOSL2 library, and Python dependencies for measurement utilities.

Quick start (WSL2):

```bash
bash openscad/install.sh
```

Outputs:
- Installs OpenSCAD via apt
- Installs BOSL2 into `~/.local/share/OpenSCAD/libraries/BOSL2`
- Creates `.venv` and installs Python deps from `requirements.txt`
- Runs a smoke test that renders a simple cube to `openscad/out/`

GUI live preview (optional):
- With WSLg (Windows 11), run:
```bash
openscad runs/<run>/scad/assembly.scad &
```
Then enable “Design → Automatic Reload and Compile”.

- Without WSLg, start an X server on Windows (VcXsrv/X410) and set:
```bash
export DISPLAY=$(grep -m1 nameserver /etc/resolv.conf | awk '{print $2}'):0.0
export LIBGL_ALWAYS_INDIRECT=1
openscad runs/<run>/scad/assembly.scad &
```

Headless usage:
- The pipeline will call `openscad` CLI for preview/export. No long-lived process is required; state is kept in the Scene IR and generated `.scad` files.


