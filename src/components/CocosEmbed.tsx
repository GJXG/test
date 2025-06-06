import React, { useEffect, useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// 创建上下文
interface CocosContextType {
  sendMessageToGame: (message: any) => void;
  isConnected: boolean;
  lastMessage: string;
  messageLog: string[];
  showIframe: boolean;
  setShowIframe: (show: boolean) => void;
  navigateToScene: (target: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
  sendUserEmail: (email: string, loginType?: number) => void;
}

const CocosContext = createContext<CocosContextType | null>(null);

// 全局状态，确保 iframe 一直存在
export const iframeRef = React.createRef<HTMLIFrameElement>();
let isGlobalInitialized = false;
let globalSetShowIframe: ((show: boolean) => void) | null = null;

// 全局方法，用于发送消息到 iframe
const sendMessageToIframe = (message: any) => {
  if (iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(message, '*');
    console.log('React: 发送数据到游戏iframe ->', message);
  } else {
    console.error('React: iframe contentWindow 未找到');
  }
};

export const useCocos = () => {
  const context = useContext(CocosContext);
  if (!context) {
    throw new Error('useCocos must be used within a CocosEmbed');
  }
  return context;
};

// 全局组件，用于保持 iframe 存在
export const GlobalIframe: React.FC = () => {
  const [showIframe, setShowIframe] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    globalSetShowIframe = setShowIframe;
    return () => {
      globalSetShowIframe = null;
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    sendMessageToIframe({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "toggleMute",
        isMuted: !isMuted
      }
    });
  };
  
  return (
    <>
      <iframe
        ref={iframeRef}
        src="https://dramai.world/webframe/"
        className={`absolute left-[300px] top-[100px] w-[486px] h-[864px] border-0 transition-opacity duration-300 ${
          showIframe ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          zIndex: 1000,
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          borderRadius: '8px 8px 8px 8px'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        loading="lazy"
        title="Game Embed"
      />
      <button
        onClick={toggleMute}
        className={`absolute left-[310px] top-[110px] w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/40 rounded-full transition-all duration-200 z-[1001] ${
          showIframe ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backdropFilter: 'blur(4px)'
        }}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        )}
      </button>
    </>
  );
};

interface CocosEmbedProps {
  className?: string;
  children?: React.ReactNode;
  sceneId?: string;
}

const CocosEmbed: React.FC<CocosEmbedProps> = ({ className, children, sceneId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [showIframe, setShowIframe] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const sendMessageToGame = (message: any) => {
    sendMessageToIframe(message);
    setMessageLog(prev => [...prev, `Sent: ${JSON.stringify(message)}`]);
  };

  const sendUserEmail = (email: string, loginType?: number) => {
    const userEmailMessage = {
      type: 'USER_LOGIN',
      action: 'setUserEmail',
      data: {
        email: email,
        timestamp: new Date().toISOString(),
        source: 'react_parent',
        loginType: loginType || 1 // 默认为1，谷歌为2，苹果为3
      }
    };
    sendMessageToGame(userEmailMessage);
    console.log('React: 发送用户邮箱到游戏 ->', email, '登录类型:', loginType || 1);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    sendMessageToGame({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "toggleMute",
        isMuted: !isMuted
      }
    });
  };

  // 添加导航函数
  const navigateToScene = (target: string) => {
    sendMessageToGame({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "navigate",
        target: target
      }
    });
    console.log(`Navigating to scene: ${target}`);
  };

  useEffect(() => {
    // 处理从 iframe 接收的消息
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data.type === 'GAME_LOADED') {
          setIsConnected(true);
          console.log('React: 游戏iframe已加载');
          
          // 检查是否有已登录的用户信息，如果有则发送邮箱
          const storedUserInfo = localStorage.getItem('userInfo');
          const storedLoginStatus = localStorage.getItem('isSignedIn');
          
          if (storedUserInfo && storedLoginStatus === 'true') {
            try {
              const userInfo = JSON.parse(storedUserInfo);
              if (userInfo.userId && userInfo.userId.includes('@')) {
                // 如果userId包含@符号，说明是邮箱格式
                sendUserEmail(userInfo.userId, 1); // 默认登录类型为1
              }
            } catch (error) {
              console.error('解析用户信息失败:', error);
            }
          }
          
          // 发送初始场景数据
          sendMessageToGame({
            type: 'INIT_SCENE',
            data: {
              scenes: []
            }
          });
        }
        setLastMessage(JSON.stringify(event.data));
        setMessageLog(prev => [...prev, `Received: ${JSON.stringify(event.data)}`]);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    // 监听localStorage变化（用户登录状态变化）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          const userInfo = JSON.parse(event.newValue);
          const isSignedIn = localStorage.getItem('isSignedIn');
          
          if (isSignedIn === 'true' && userInfo.userId && userInfo.userId.includes('@')) {
            // 用户刚刚登录，发送邮箱到游戏
            sendUserEmail(userInfo.userId, 1); // 默认登录类型为1
          }
        } catch (error) {
          console.error('处理用户登录状态变化失败:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 组件挂载时显示 iframe
  useEffect(() => {
    if (globalSetShowIframe) {
      globalSetShowIframe(true);
      setShowIframe(true);
    }
    
    return () => {
      if (globalSetShowIframe) {
        globalSetShowIframe(false);
        setShowIframe(false);
      }
    };
  }, []);
  
  return (
    <CocosContext.Provider value={{ 
      sendMessageToGame, 
      isConnected, 
      lastMessage, 
      messageLog,
      showIframe,
      setShowIframe,
      navigateToScene,
      isMuted,
      toggleMute,
      sendUserEmail
    }}>
      {children}
    </CocosContext.Provider>
  );
};

export default CocosEmbed;
