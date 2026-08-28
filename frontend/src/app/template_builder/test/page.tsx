'use client';
import React, { useEffect, useRef } from 'react';
import 'grapesjs/dist/css/grapes.min.css';

export default function TestPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let e: any;
    import('grapesjs').then(gjs => {
      e = gjs.default.init({
        container: editorRef.current as HTMLElement,
        fromElement: false,
        height: '500px',
        width: '100%',
      });
      console.log('GrapesJS initialized', e);
    }).catch(err => {
      console.error('Error', err);
      alert(err.message);
    });
    return () => {
      if (e) e.destroy();
    }
  }, []);

  return (
    <div style={{ padding: '50px', background: '#f0f0f0', height: '100vh' }}>
      <h1>Test Editor</h1>
      <div ref={editorRef} style={{ border: '2px solid red', height: '500px' }}></div>
    </div>
  );
}
