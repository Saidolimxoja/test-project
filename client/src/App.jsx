import { useRef, useCallback } from 'react';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';

export default function App() {
   const leftReloadRef = useRef(null);
   const rightReloadRef = useRef(null);

   const refreshBoth = useCallback(() => {
      leftReloadRef.current?.();
      rightReloadRef.current?.();
   }, []);

   return (
      <div className="app-layout">
         <LeftPanel reloadRef={leftReloadRef} onSelect={refreshBoth} />
         <RightPanel reloadRef={rightReloadRef} onDeselect={refreshBoth} />
      </div>
   );
}
