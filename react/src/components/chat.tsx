import { useContext, useEffect, useRef, useState } from 'react';
import { useChat, useFiles } from 'privategpt-sdk-web/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PrivategptApi } from 'privategpt-sdk-web';
import { PrivategptClient } from '@/lib/pgpt';
import { Textarea } from '@/components/ui/textarea';
import { marked } from 'marked';
import { useLocalStorage } from 'usehooks-ts';
import Dropdown from './ui/dropdown';
import AssistantAvatar from '../assets/images/logo.png'
import Prism from 'prismjs';
import 'prismjs/components/prism-markup-templating.js';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp'; // C++
import 'prismjs/components/prism-csharp'; // C#
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss'; // Sass/SCSS
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash'; // Shell scripting
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-ini'; // Config files
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-matlab';
import 'prismjs/components/prism-perl';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sas';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-latex';
import 'prismjs/components/prism-haskell';
import 'prismjs/components/prism-elixir';
import 'prismjs/components/prism-coffeescript';
import 'prismjs/themes/prism.css';
import { dataObj } from '@/types';
import { AppContext } from '@/AppContext';

const MODES = [
  {
    value: 'query',
    title: 'Query docs',
    description:
      'Uses the context from the ingested documents to answer the questions',
  },
  {
    value: 'search',
    title: 'Search files',
    description: 'Fast search that returns the 4 most related text chunks',
  },
  {
    value: 'chat',
    title: 'LLM Chat',
    description: 'No context from files',
  },
]

export function Chat() {
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useLocalStorage<(typeof MODES)[number]['value']>('pgpt-chat-mode', 'chat');
  const [environment] = useLocalStorage('pgpt-url', '');
  const [input, setInput] = useState('');
  const [copyMessage, setCopyMessage] = useState(-1)
  const [goodScore, setGoodScore] = useState(-1)
  const [badScore, setBadScore] = useState(-1)
  const [systemPrompt, setSystemPrompt] = useLocalStorage<string>('system-prompt', '');
  const [messages, setMessages, clearChat] = useLocalStorage<Array<PrivategptApi.OpenAiMessage & { score?: boolean, sources?: PrivategptApi.Chunk[] }>>('messages', []);
  const [selectedFiles, setSelectedFiles] = useLocalStorage<string[]>('selected-files', []);
  const [scrollToTop, setScrolltoTop] = useState(0)
  const { isMobile } = useContext(AppContext)

  const completionPrompt = `
    <span class='chat__completion-prompt'> ●</span>
  `

  const { addFile, files, deleteFile, isUploadingFile, isFetchingFiles } = useFiles({
    client: PrivategptClient.getInstance(environment),
    fetchFiles: true
  });

  const { completion, isLoading, stop } = useChat({
    client: PrivategptClient.getInstance(environment),
    messages: messages.map(({ sources: _, ...rest }) => rest),
    onFinish: ({ completion: c, sources: s }) => {
      addMessage({ role: 'assistant', content: c, sources: s });
      setTimeout(() => {
        messageRef.current?.focus();
      }, 100);
    },
    useContext: mode === 'query',
    enabled: ['query', 'chat'].includes(mode),
    includeSources: mode === 'query',
    systemPrompt,
    contextFilter: {
      docsIds: ['query', 'search'].includes(mode)
        ? selectedFiles.reduce((acc, fileName) => {
          const groupedDocs = files?.filter((f) => f.fileName === fileName);
          if (!groupedDocs) return acc;
          const docIds = [] as string[];
          groupedDocs.forEach((d) => {
            docIds.push(...d.docs.map((d) => d.docId));
          });
          acc.push(...docIds);
          return acc;
        }, [] as string[])
        : [],
    },
  });

  useEffect(() => {
    const checkScrollUp = (e: any, st: number) => {
      if (e.target && e.target.scrollingElement.scrollTop) {
        const scroll = e.target.scrollingElement.scrollTop
        if (!st && scroll) setScrolltoTop(scroll)
      }
    }

    document.addEventListener('scroll', (e) => checkScrollUp(e, scrollToTop))
    return () => document.removeEventListener('scroll', (e) => checkScrollUp(e, scrollToTop))
  }, [])

  useEffect(() => {
    const textarea = document.getElementById('message')
    resizeTextArea(textarea)
    if (input) {
      setScrolltoTop(0)
    }
  }, [input])

  useEffect(() => {
    if (completion && !scrollToTop) {
      window.scrollTo(0, document.body.scrollHeight)
    }
    Prism.highlightAll()
  }, [completion])

  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight)
  }, [messages])

  const stopGenerating = () => {
    console.log('completion', completion)
    console.log('messages', messages)
    console.log('isLoading', isLoading)
    stop()
  }

  const handleSubmit = (event: any) => {
    event.preventDefault();
    if (!input.trim()) return;
    const content = input.trim();
    addMessage({ role: 'user', content });
    if (mode === 'search') {
      searchDocs(content);
    }
  };

  const addMessage = (
    message: PrivategptApi.OpenAiMessage & {
      sources?: PrivategptApi.Chunk[];
    },
  ) => {
    setMessages((prev) => [...prev, message]);
    setInput('');
  };

  const searchDocs = async (input: string) => {
    const chunks = await PrivategptClient.getInstance(
      environment,
    ).contextChunks.chunksRetrieval({ text: input });
    const content = chunks.data.reduce((acc, chunk, index) => {
      return `${acc}**${index + 1}.${chunk.document.docMetadata?.file_name}${chunk.document.docMetadata?.page_label
        ? ` (page ${chunk.document.docMetadata?.page_label})** `
        : '**'
        }\n\n ${chunk.document.docMetadata?.original_text} \n\n  `;
    }, '');
    addMessage({ role: 'assistant', content });
  };

  const resizeTextArea = (textarea: any) => {
    const { style } = textarea
    style.height = style.minHeight = 'auto'
    style.minHeight = `${Math.min(textarea.scrollHeight + 4, parseInt(textarea.style.maxHeight))}px`
    style.height = `${textarea.scrollHeight + 4}px`

    const form = document.querySelector('.chat__form') as HTMLDivElement
    const send = document.querySelector('.chat__form-send') as HTMLDivElement
    const outputChat = document.querySelector('.chat__output') as HTMLDivElement

    form.style.alignItems = 'center'
    send.style.marginBottom = '0'

    outputChat.style.marginBottom = textarea.scrollHeight > 80 ? '46vh' : '6rem'
    if (textarea.scrollHeight > 60) {
      style.padding = '1rem 0'
      form.style.alignItems = 'flex-end'
      send.style.marginBottom = '1rem'
    }
  }

  const copyToClipboard = (index: number) => {
    const text = messages[index].content || ''
    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => setCopyMessage(index), 200)
      setTimeout(() => setCopyMessage(-1), 1500)
    }).catch((error) => {
      console.error('Failed to copy text: ', error);
    });
  }

  const scoreMessage = (index: number, score: boolean) => {
    const scoredMessages = [...messages]
    scoredMessages[index].score = score
    setMessages(scoredMessages)

    setTimeout(() => score ? setGoodScore(index) : setBadScore(index), 100)
    setTimeout(() => score ? setGoodScore(-1) : setBadScore(-1), 1500)
  }

  const selectFile = (file: { fileName: string, docs: PrivategptApi.IngestedDoc[] } | undefined) => {
    if (file) {
      const isSelected = selectedFiles.includes(file.fileName)
      setSelectedFiles(isSelected ?
        selectedFiles.filter(f => f !== file.fileName)
        : [...selectedFiles, file.fileName]
      )
    }
  }

  const embedPromptSymbol = (html: string) => {
    const parsed = html

    return parsed
  }

  return (
    <div className="chat__container">
      <div className="chat__panel">
        <form className="chat__panel-form">
          <Dropdown
            label='Mode'
            options={MODES}
            objKey='title'
            value={MODES.find(m => m.value === mode)}
            selected={MODES.find(m => m.value === mode)}
            setSelected={m => setMode(m.value)}
          />
          {['query', 'search'].includes(mode) && (
            <>
              <div className='chat__file-list-ingested'>
                <p className="chat__file-title">Files</p>
                {isFetchingFiles ? (
                  <p>Fetching files...</p>
                ) : (
                  <div className='chat__file-list'>
                    {files && files.length > 0 ? (
                      files.map((file, index) => (
                        <div key={index} className='chat__file-list-item'>
                          <p className='chat__file-list-item-filename'>{file.fileName}</p>
                          <Button
                            onClick={(e: any) => {
                              e.preventDefault();
                              deleteFile(file.fileName);
                              setSelectedFiles(
                                selectedFiles.filter(
                                  (f) => f !== file.fileName,
                                ),
                              );
                            }}
                            style={{ borderRadius: '.5rem', lineHeight: '.2rem', height: '1.5rem', width: '1.5rem', padding: '0 0 .1rem .1rem', fontSize: '1rem' }}
                            label='x'
                            className='button__outline' />
                        </div>
                      ))
                    ) : (
                      <p>No files ingested</p>
                    )}
                    {isUploadingFile && <p>Uploading file...</p>}
                  </div>
                )}
              </div>
              {mode === 'query' && files && files.length > 1 ? isFetchingFiles ?
                <p>Fetching files...</p>
                : (
                  <div className='chat__file-list-checked'>
                    <p className="chat__file-title">Select where to look into</p>
                    <div className='chat__file-list'>
                      {files && files.length > 0 ? (
                        files.map((file, index) => (
                          <div key={index} className='chat__file-list-item'>
                            <p className='chat__file-list-item-filename'>{file.fileName}</p>
                            <input
                              type='checkbox'
                              checked={selectedFiles.includes(file.fileName)}
                              onChange={() => selectFile(file)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        ))
                      ) : (
                        <p>No files ingested</p>
                      )}
                      {isUploadingFile && <p>Uploading file...</p>}
                    </div>
                  </div>
                ) : ''}
            </>
          )}

          <div className="chat__panel-prompt">
            <p className='chat__panel-prompt-title'>System prompt</p>
            <textarea
              id="content"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a..."
              className="chat__panel-prompt-input"
              rows={window.innerWidth > 1150 ? 5 : 1}
            />
          </div>
          <Button onClick={clearChat} label='Clear chat' className='chat__panel-button button__outline' />
        </form>
      </div>
      <div className="chat__panel-ghost" />
      <main className="chat__main" style={{ justifyContent: messages.length ? 'flex-start' : 'center' }}>
        <div className="chat__output">
          <div className="chat__box">
            <div className="chat__box-list">
              {!messages.length ?
                <p className='chat__box-hi'>Hi, what can I help you with today?</p>
                : messages.map((message, index) => (
                  <div key={index} className={`chat__message chat__message-${message.role || ''}`}>
                    {message.role === 'assistant' ? <img src={AssistantAvatar} alt='Assistant Avatar' className='chat__message-avatar' draggable={false} /> : ''}
                    <div className={`chat__message-bubble chat__message-bubble-${message.role || ''}`}>
                      <div
                        className={`chat__message-content chat__message-content-${message.role || ''}`}
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(message.content || ''),
                        }} />
                      {message.sources && message.sources?.length > 0 && (
                        <div className='chat__message-sources'>
                          <p className="chat__message-sources-title">Sources:</p>
                          {message.sources.map((source) => (
                            <p key={source.document.docId}>
                              <strong>
                                {source.document.docMetadata?.file_name as string}
                              </strong>
                            </p>
                          ))}
                        </div>
                      )}
                      {message.role === 'assistant' ?
                        <div className="chat__message-controls">
                          {copyMessage === index ?
                            <svg className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M18.0633 5.67387C18.5196 5.98499 18.6374 6.60712 18.3262 7.06343L10.8262 18.0634C10.6585 18.3095 10.3898 18.4679 10.0934 18.4957C9.79688 18.5235 9.50345 18.4178 9.29289 18.2072L4.79289 13.7072C4.40237 13.3167 4.40237 12.6835 4.79289 12.293C5.18342 11.9025 5.81658 11.9025 6.20711 12.293L9.85368 15.9396L16.6738 5.93676C16.9849 5.48045 17.607 5.36275 18.0633 5.67387Z" fill="currentColor"></path></svg>
                            : <svg onClick={() => copyToClipboard(index)} className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>
                          }
                          {goodScore === index ?
                            <svg className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M18.0633 5.67387C18.5196 5.98499 18.6374 6.60712 18.3262 7.06343L10.8262 18.0634C10.6585 18.3095 10.3898 18.4679 10.0934 18.4957C9.79688 18.5235 9.50345 18.4178 9.29289 18.2072L4.79289 13.7072C4.40237 13.3167 4.40237 12.6835 4.79289 12.293C5.18342 11.9025 5.81658 11.9025 6.20711 12.293L9.85368 15.9396L16.6738 5.93676C16.9849 5.48045 17.607 5.36275 18.0633 5.67387Z" fill="currentColor"></path></svg>
                            : <svg onClick={() => scoreMessage(index, true)} className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.1318 2.50389C12.3321 2.15338 12.7235 1.95768 13.124 2.00775L13.5778 2.06447C16.0449 2.37286 17.636 4.83353 16.9048 7.20993L16.354 8.99999H17.0722C19.7097 8.99999 21.6253 11.5079 20.9313 14.0525L19.5677 19.0525C19.0931 20.7927 17.5124 22 15.7086 22H6C4.34315 22 3 20.6568 3 19V12C3 10.3431 4.34315 8.99999 6 8.99999H8C8.25952 8.99999 8.49914 8.86094 8.6279 8.63561L12.1318 2.50389ZM10 20H15.7086C16.6105 20 17.4008 19.3964 17.6381 18.5262L19.0018 13.5262C19.3488 12.2539 18.391 11 17.0722 11H15C14.6827 11 14.3841 10.8494 14.1956 10.5941C14.0071 10.3388 13.9509 10.0092 14.0442 9.70591L14.9932 6.62175C15.3384 5.49984 14.6484 4.34036 13.5319 4.08468L10.3644 9.62789C10.0522 10.1742 9.56691 10.5859 9 10.8098V19C9 19.5523 9.44772 20 10 20ZM7 11V19C7 19.3506 7.06015 19.6872 7.17071 20H6C5.44772 20 5 19.5523 5 19V12C5 11.4477 5.44772 11 6 11H7Z" fill="currentColor"></path></svg>
                          }
                          {badScore === index ?
                            <svg className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M18.0633 5.67387C18.5196 5.98499 18.6374 6.60712 18.3262 7.06343L10.8262 18.0634C10.6585 18.3095 10.3898 18.4679 10.0934 18.4957C9.79688 18.5235 9.50345 18.4178 9.29289 18.2072L4.79289 13.7072C4.40237 13.3167 4.40237 12.6835 4.79289 12.293C5.18342 11.9025 5.81658 11.9025 6.20711 12.293L9.85368 15.9396L16.6738 5.93676C16.9849 5.48045 17.607 5.36275 18.0633 5.67387Z" fill="currentColor"></path></svg>
                            : <svg onClick={() => scoreMessage(index, false)} className='chat__message-copy' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.8727 21.4961C11.6725 21.8466 11.2811 22.0423 10.8805 21.9922L10.4267 21.9355C7.95958 21.6271 6.36855 19.1665 7.09975 16.7901L7.65054 15H6.93226C4.29476 15 2.37923 12.4921 3.0732 9.94753L4.43684 4.94753C4.91145 3.20728 6.49209 2 8.29589 2H18.0045C19.6614 2 21.0045 3.34315 21.0045 5V12C21.0045 13.6569 19.6614 15 18.0045 15H16.0045C15.745 15 15.5054 15.1391 15.3766 15.3644L11.8727 21.4961ZM14.0045 4H8.29589C7.39399 4 6.60367 4.60364 6.36637 5.47376L5.00273 10.4738C4.65574 11.746 5.61351 13 6.93226 13H9.00451C9.32185 13 9.62036 13.1506 9.8089 13.4059C9.99743 13.6612 10.0536 13.9908 9.96028 14.2941L9.01131 17.3782C8.6661 18.5002 9.35608 19.6596 10.4726 19.9153L13.6401 14.3721C13.9523 13.8258 14.4376 13.4141 15.0045 13.1902V5C15.0045 4.44772 14.5568 4 14.0045 4ZM17.0045 13V5C17.0045 4.64937 16.9444 4.31278 16.8338 4H18.0045C18.5568 4 19.0045 4.44772 19.0045 5V12C19.0045 12.5523 18.5568 13 18.0045 13H17.0045Z" fill="currentColor"></path></svg>
                          }
                        </div> : ''}
                    </div>
                  </div>
                ))}
              {completion && (
                <div className='chat__message chat__message-assistant chat__message-completion'>
                  <img src={AssistantAvatar} alt='Assistant Avatar' className='chat__message-avatar' draggable={false} />
                  <div className="chat__message-bubble">
                    <div
                      className="chat__message-content chat__message-content-assistant"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(embedPromptSymbol(completion)),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="chat__form-container" style={{ position: messages.length ? 'fixed' : 'unset' }}>
            <form className="chat__form" x-chunk="dashboard-03-chunk-1" onSubmit={handleSubmit}>
              <div className="chat__form-attachment">
                <svg className='chat__form-attachment-svg' onClick={() => {
                  const input = document.createElement(
                    'input',
                  ) as HTMLInputElement;
                  input.type = 'file';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement)
                      ?.files?.[0];
                    if (!file) return;
                    addFile(file);
                  };
                  input.click();
                  input.remove();
                }}
                  xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7 8.00092L7 17C7 17.5523 6.55228 18 6 18C5.44772 18 5.00001 17.4897 5 16.9374C5 16.9374 5 16.9374 5 16.9374C5 16.937 5.00029 8.01023 5.00032 8.00092C5.00031 7.96702 5.00089 7.93318 5.00202 7.89931C5.00388 7.84357 5.00744 7.76644 5.01426 7.67094C5.02788 7.4803 5.05463 7.21447 5.10736 6.8981C5.21202 6.27011 5.42321 5.41749 5.85557 4.55278C6.28989 3.68415 6.95706 2.78511 7.97655 2.10545C9.00229 1.42162 10.325 1 12 1C13.6953 1 14.9977 1.42162 16.0235 2.10545C17.0429 2.78511 17.7101 3.68415 18.1444 4.55278C18.5768 5.41749 18.788 6.27011 18.8926 6.8981C18.9454 7.21447 18.9721 7.4803 18.9857 7.67094C18.9926 7.76644 18.9961 7.84357 18.998 7.89931C18.9991 7.93286 18.9997 7.96641 19 7.99998C19.0144 10.7689 19.0003 17.7181 19 18.001C19 18.0268 18.9993 18.0525 18.9985 18.0782C18.9971 18.1193 18.9945 18.175 18.9896 18.2431C18.9799 18.3791 18.961 18.5668 18.9239 18.7894C18.8505 19.2299 18.7018 19.8325 18.3944 20.4472C18.0851 21.0658 17.6054 21.7149 16.8672 22.207C16.1227 22.7034 15.175 23 14 23C12.825 23 11.8773 22.7034 11.1328 22.207C10.3946 21.7149 9.91489 21.0658 9.60557 20.4472C9.29822 19.8325 9.14952 19.2299 9.07611 18.7894C9.039 18.5668 9.02007 18.3791 9.01035 18.2431C9.00549 18.175 9.0029 18.1193 9.00153 18.0782C9.00069 18.0529 9.00008 18.0275 9 18.0022C8.99621 15.0044 9 12.0067 9 9.00902C9.00101 8.95723 9.00276 8.89451 9.00645 8.84282C9.01225 8.76155 9.02338 8.65197 9.04486 8.5231C9.08702 8.27011 9.17322 7.91749 9.35558 7.55278C9.53989 7.18415 9.83207 6.78511 10.2891 6.48045C10.7523 6.17162 11.325 6 12 6C12.675 6 13.2477 6.17162 13.7109 6.48045C14.1679 6.78511 14.4601 7.18415 14.6444 7.55278C14.8268 7.91749 14.913 8.27011 14.9551 8.5231C14.9766 8.65197 14.9877 8.76155 14.9936 8.84282C14.9984 8.91124 14.9999 8.95358 15 8.99794L15 17C15 17.5523 14.5523 18 14 18C13.4477 18 13 17.5523 13 17V9.00902C12.9995 8.99543 12.9962 8.93484 12.9824 8.8519C12.962 8.72989 12.9232 8.58251 12.8556 8.44722C12.7899 8.31585 12.7071 8.21489 12.6015 8.14455C12.5023 8.07838 12.325 8 12 8C11.675 8 11.4977 8.07838 11.3985 8.14455C11.2929 8.21489 11.2101 8.31585 11.1444 8.44722C11.0768 8.58251 11.038 8.72989 11.0176 8.8519C11.0038 8.93484 11.0005 8.99543 11 9.00902V17.9957C11.0009 18.0307 11.0028 18.0657 11.0053 18.1006C11.0112 18.1834 11.0235 18.3082 11.0489 18.4606C11.1005 18.7701 11.2018 19.1675 11.3944 19.5528C11.5851 19.9342 11.8554 20.2851 12.2422 20.543C12.6227 20.7966 13.175 21 14 21C14.825 21 15.3773 20.7966 15.7578 20.543C16.1446 20.2851 16.4149 19.9342 16.6056 19.5528C16.7982 19.1675 16.8995 18.7701 16.9511 18.4606C16.9765 18.3082 16.9888 18.1834 16.9947 18.1006C16.9972 18.0657 16.9991 18.0307 17 17.9956L16.9999 7.99892C16.9997 7.98148 16.9982 7.91625 16.9908 7.81343C16.981 7.67595 16.9609 7.47303 16.9199 7.2269C16.837 6.72989 16.6732 6.08251 16.3556 5.44722C16.0399 4.81585 15.5821 4.21489 14.9141 3.76955C14.2523 3.32838 13.325 3 12 3C10.675 3 9.7477 3.32838 9.08595 3.76955C8.41793 4.21489 7.96011 4.81585 7.64443 5.44722C7.32678 6.08251 7.16298 6.72989 7.08014 7.2269C7.03912 7.47303 7.019 7.67595 7.00918 7.81343C7.0025 7.90687 7.00117 7.9571 7 8.00092Z" fill="#0F0F0F" />
                </svg>
              </div>
              <textarea
                ref={messageRef}
                disabled={isLoading}
                id="message"
                placeholder="Type your message..."
                className="chat__form-input"
                value={input}
                name="content"
                rows={1}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (!input.trim()) return
                    event.currentTarget.form?.dispatchEvent(
                      new Event('submit', { bubbles: true }),
                    );
                  }
                }}
                autoFocus
                onChange={(event) => setInput(event.target.value)}
              />
              {isLoading ? (
                <div
                  className='chat__form-send'
                  onClick={stopGenerating} >
                  <svg className='chat__form-send-svg' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="10" height="10" rx="1.25" fill="black"></rect></svg>
                </div>
              ) : (
                <div
                  className='chat__form-send'
                  style={{
                    background: input ? '' : 'gray',
                    cursor: input ? '' : 'not-allowed'
                  }}
                  onClick={handleSubmit} >
                  <svg className='chat__form-send-svg' width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill='#2F2F2F' fill-rule="evenodd" clip-rule="evenodd" d="M15.1918 8.90615C15.6381 8.45983 16.3618 8.45983 16.8081 8.90615L21.9509 14.049C22.3972 14.4953 22.3972 15.2189 21.9509 15.6652C21.5046 16.1116 20.781 16.1116 20.3347 15.6652L17.1428 12.4734V22.2857C17.1428 22.9169 16.6311 23.4286 15.9999 23.4286C15.3688 23.4286 14.8571 22.9169 14.8571 22.2857V12.4734L11.6652 15.6652C11.2189 16.1116 10.4953 16.1116 10.049 15.6652C9.60265 15.2189 9.60265 14.4953 10.049 14.049L15.1918 8.90615Z"></path>
                  </svg>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
