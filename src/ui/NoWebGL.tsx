import { Component, type ReactNode } from 'react';

/** Shown in place of the 3D scenes when the browser cannot start WebGL: the title stays, with a plain explanation. */
export function NoWebGL() {
  return (
    <div className="app">
      <div className="title nogl">
        <span className="eyebrow">Dành riêng cho Su, từ Phú</span>
        <h1>Trú Mưa</h1>
        <div className="panel glass" role="alert">
          <p>Máy này chưa mở được cảnh 3D của Trú Mưa (WebGL không khởi động được).</p>
          <p className="sub">Bật tăng tốc phần cứng trong trình duyệt hoặc thử trình duyệt khác, rồi tải lại trang nhé.</p>
          <div className="choice">
            <button type="button" className="btn gold" onClick={() => window.location.reload()}>
              Tải lại trang
            </button>
          </div>
        </div>
        <span className="credit">Phu Nguyen — HCMC, VN</span>
      </div>
    </div>
  );
}

/** Catches a Canvas that still fails to start (context refused or lost at creation) and shows the same fallback. */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('the 3D scene failed to start', err);
  }
  render() {
    return this.state.failed ? <NoWebGL /> : this.props.children;
  }
}
