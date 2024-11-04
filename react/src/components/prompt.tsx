import { CornerDownLeft, Paperclip, StopCircle } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFiles, usePrompt } from 'privategpt-sdk-web/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { PrivategptApi } from 'privategpt-sdk-web';
import { PrivategptClient } from '@/lib/pgpt';
import { Textarea } from '@/components/ui/textarea';
import { marked } from 'marked';
import { useLocalStorage } from 'usehooks-ts';

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
    value: 'prompt',
    title: 'Prompt',
    description: 'No context from files',
  },
] as const;

export function Prompt() {
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useLocalStorage<(typeof MODES)[number]['value']>(
    'pgpt-prompt-mode',
    'prompt',
  );
  const [sources, setSources] = useLocalStorage(
    'pgpt-sources',
    [] as PrivategptApi.Chunk[],
  );
  const [environment] = useLocalStorage('pgpt-url', '');
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useLocalStorage<string>(
    'system-prompt',
    '',
  );
  const [selectedFiles, setSelectedFiles] = useLocalStorage<string[]>(
    'selected-files',
    [],
  );
  const { addFile, files, deleteFile, isUploadingFile, isFetchingFiles } =
    useFiles({
      client: PrivategptClient.getInstance(environment),
      fetchFiles: true,
    });

  const { completion, isLoading, stop, setCompletion } = usePrompt({
    client: PrivategptClient.getInstance(environment),
    prompt,
    useContext: mode === 'query',
    enabled: prompt.length > 0 && ['query', 'prompt'].includes(mode),
    onFinish: ({ sources }) => {
      setSources(sources);
      setTimeout(() => {
        messageRef.current?.focus();
      }, 100);
    },
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input) return;
    const content = input.trim();
    addPrompt(content);
    if (mode === 'search') {
      searchDocs(content);
    }
  };

  const addPrompt = (message: string) => {
    setPrompt(message);
    setInput('');
  };

  const searchDocs = async (input: string) => {
    const chunks = await PrivategptClient.getInstance(
      environment,
    ).contextChunks.chunksRetrieval({ text: input });
    const content = chunks.data.reduce((acc, chunk, index) => {
      return `${acc}**${index + 1}.${chunk.document.docMetadata?.file_name
        } (page ${chunk.document.docMetadata?.page_label})** \n\n ${chunk.document.docMetadata?.original_text
        } \n\n`;
    }, '');
    setCompletion(content);
  };

  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [completion]);

  useEffect(() => {
    setSources([]);
  }, [prompt]);

  return (
    <div className="prompt__container">
      <div className="prompt__content">
        <header className="prompt__header">
          <div className="prompt__title-container">
            <h1 className="prompt__title">Playground</h1>
            <Link to="/chat">Go to chat</Link>
          </div>
          <Button
            onClick={() => {
              setPrompt('');
              setCompletion('');
            }}
            label="Clear"
          />
        </header>
        <main className="prompt__main">
          <div className="prompt__sidebar" x-chunk="dashboard-03-chunk-0">
            <form className="prompt__form">
              <fieldset className="prompt__fieldset">
                <legend className="prompt__legend">Mode</legend>
                <div className="prompt__select-container">
                  <Select value={mode} onValueChange={setMode as any}>
                    <SelectTrigger id="mode" className="prompt__select-trigger">
                      <SelectValue placeholder="Select a mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          <div className="prompt__select-item">
                            <p>{mode.title}</p>
                            <p className="prompt__item-description">
                              {mode.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>
              {['query', 'search'].includes(mode) && (
                <>
                  <fieldset className="prompt__fieldset">
                    <legend className="prompt__legend">Files</legend>
                    {isFetchingFiles ? (
                      <p>Fetching files...</p>
                    ) : (
                      <div className="prompt__file-list">
                        {files && files.length > 0 ? (
                          files.map((file, index) => (
                            <div key={index} className="prompt__file-item">
                              <p>{file.fileName}</p>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  deleteFile(file.fileName);
                                  setSelectedFiles(
                                    selectedFiles.filter(
                                      (f) => f !== file.fileName,
                                    ),
                                  );
                                }}
                                label="x"
                              />
                            </div>
                          ))
                        ) : (
                          <p>No files ingested</p>
                        )}
                        {isUploadingFile && <p>Uploading file...</p>}
                      </div>
                    )}
                  </fieldset>
                  {mode === 'query' && (
                    <fieldset className="prompt__fieldset">
                      <legend className="prompt__legend">
                        Ask to your docs (if none is selected, it will ask to all of
                        them)
                      </legend>
                      {isFetchingFiles ? (
                        <p>Fetching files...</p>
                      ) : (
                        <div className="prompt__checkbox-list">
                          {files && files.length > 0 ? (
                            files.map((file, index) => (
                              <div key={index} className="prompt__checkbox-item">
                                <p>{file.fileName}</p>
                                <Checkbox
                                  checked={selectedFiles.includes(
                                    file.fileName,
                                  )}
                                  onCheckedChange={() => {
                                    const isSelected = selectedFiles.includes(
                                      file.fileName,
                                    );
                                    setSelectedFiles(
                                      isSelected
                                        ? selectedFiles.filter(
                                          (f) => f !== file.fileName,
                                        )
                                        : [...selectedFiles, file.fileName],
                                    );
                                  }}
                                />
                              </div>
                            ))
                          ) : (
                            <p>No files ingested</p>
                          )}
                          {isUploadingFile && <p>Uploading file...</p>}
                        </div>
                      )}
                    </fieldset>
                  )}
                </>
              )}
              <div className="prompt__input-group">
                <Label htmlFor="content">System prompt</Label>
                <Textarea
                  id="content"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a..."
                  className="prompt__textarea"
                />
              </div>
            </form>
          </div>
          <div className="prompt__output">
            <Badge variant="outline" className="prompt__output-badge">
              Output
            </Badge>
            <div className="prompt__output-content">
              <div className="prompt__output-text">
                {prompt && (
                  <div className="prompt__user-prompt">
                    <Badge variant="outline" className="prompt__user-badge">
                      user
                    </Badge>
                    <div
                      className="prompt__user-text"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(prompt),
                      }}
                    />
                  </div>
                )}
                {completion && (
                  <div className="prompt__assistant-output">
                    <Badge variant="outline" className="prompt__assistant-badge">
                      assistant
                    </Badge>
                    <div
                      className="prompt__assistant-text"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(completion),
                      }}
                    />
                    {sources?.length > 0 && (
                      <div className="prompt__sources">
                        <p className="prompt__sources-title">Sources:</p>
                        {sources.map((source) => (
                          <p key={source.document.docId}>
                            <strong>
                              {source.document.docMetadata?.file_name as string}
                            </strong>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <form
                className="prompt__message-form"
                x-chunk="dashboard-03-chunk-1"
                onSubmit={handleSubmit}
              >
                <Label htmlFor="message" className="sr-only">
                  Message
                </Label>
                <Textarea
                  id="message"
                  ref={messageRef}
                  disabled={isLoading}
                  placeholder="Type your message here..."
                  className="prompt__message-textarea"
                  value={input}
                  name="content"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.dispatchEvent(
                        new Event('submit', { bubbles: true }),
                      );
                    }
                  }}
                  autoFocus
                  onChange={(event) => setInput(event.target.value)}
                />
                <div className="prompt__form-actions">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            const input = document.createElement(
                              'input',
                            ) as HTMLInputElement;
                            input.type = 'file';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)?.files?.[0];
                              if (!file) return;
                              addFile(file);
                            };
                            input.click();
                            input.remove();
                          }}
                          label="Attach file"
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">Attach File</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {isLoading ? (
                    <Button onClick={stop} label="Stop" />
                  ) : (
                    <Button label="Send Message" />
                  )}
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
