import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { Map, Edit3, Settings, ArrowLeft, MessageSquare, RefreshCw, PanelLeft, PanelRight, Save, Grid, Hand, Pencil, Undo2, Redo2, FilePlus, Sparkles, Maximize, Minimize } from 'lucide-react';

interface RpgModeProps {
  onBack: () => void;
}

import { useAppStore } from '../store/appStore';

interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

function PhaserGame({ mode, mapName, onMapSaved, roleWalkSprite, roleAtkSprite, playerName, onChatReceived, onSocketReady }: { key?: React.Key, mode: 'play' | 'edit', mapName: string, onMapSaved?: () => void, roleWalkSprite: string, roleAtkSprite: string, playerName: string, onChatReceived: (msg: ChatMessage) => void, onSocketReady: (socket: Socket) => void }) {
  const gameRef = useRef<HTMLDivElement>(null);
  const infoTextRef = useRef<HTMLDivElement>(null);
  const mainSceneRef = useRef<any>(null);
  const [actionMode, setActionMode] = useState<'walk' | 'attack'>('walk');
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // Initialize Socket.io
    const socketUrl = window.location.origin;
    const socket = io(socketUrl);
    socketRef.current = socket;
    if (onSocketReady) onSocketReady(socket);

    let isDestroyed = false;

    class MainScene extends Phaser.Scene {
      private mapData: any = null;
      private player: Phaser.Physics.Arcade.Sprite | null = null;
      private otherPlayers: Record<string, Phaser.Physics.Arcade.Sprite> = {};
      private npcs: Record<string, Phaser.Physics.Arcade.Sprite> = {};
      private nameTags: Record<string, Phaser.GameObjects.Text> = {};
      private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
      private currentTileType: number = 2; // 2=grass, 48=water, 94=mountain
      public currentEditLayer: 'ground' | 'object' = 'ground';
      public isEraser: boolean = false;
      private isEditor: boolean = false;
      private saveButton: Phaser.GameObjects.Text | null = null;
      private tileSelector: Phaser.GameObjects.Text | null = null;
      private lastAnim: string | null = null;
      private joystickBase: Phaser.GameObjects.Arc | null = null;
      private joystickGraphics: Phaser.GameObjects.Graphics | null = null;
      private joystickThumb: Phaser.GameObjects.Arc | null = null;
      private joystickActive: boolean = false;
      private joystickVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private isAttacking: boolean = false;
      public actionMode: 'walk' | 'attack' = 'walk';
      private currentDirection: string = 'down';
      private gridGraphics: Phaser.GameObjects.Graphics | null = null;
      public attackButtonDown: boolean = false;
      private undoStack: { tiles: number[], objects?: number[] }[] = [];
      private redoStack: { tiles: number[], objects?: number[] }[] = [];
      private isPanning: boolean = false;
      public editorMode: 'draw' | 'move' = 'draw';
      private panStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private camStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private tilemap: Phaser.Tilemaps.Tilemap | null = null;
      private tileset: Phaser.Tilemaps.Tileset | null = null;
      private layer: Phaser.Tilemaps.TilemapLayer | null = null;
      private objectLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private infoText: Phaser.GameObjects.Text | null = null;
      private chatBubbles: Record<string, Phaser.GameObjects.Container> = {};
      private chatTimers: Record<string, Phaser.Time.TimerEvent> = {};
      private initialZoomDistance: number = 0;
      private initialZoom: number = 1;

      constructor() {
        super('MainScene');
      }

      init(data: any) {
        this.isEditor = data.mode === 'edit';
        mainSceneRef.current = this;
        (window as any).__PHASER_MAIN_SCENE__ = this;
      }

      public performUndo() {
        if (this.undoStack.length > 0) {
          const prevState = this.undoStack.pop()!;
          this.redoStack.push({
            tiles: [...this.mapData.tiles],
            objects: this.mapData.objects ? [...this.mapData.objects] : []
          });
          this.mapData.tiles = [...prevState.tiles];
          if (prevState.objects) this.mapData.objects = [...prevState.objects];
          this.renderMap();
        }
      }

      public performRedo() {
        if (this.redoStack.length > 0) {
          const nextState = this.redoStack.pop()!;
          this.undoStack.push({
            tiles: [...this.mapData.tiles],
            objects: this.mapData.objects ? [...this.mapData.objects] : []
          });
          this.mapData.tiles = [...nextState.tiles];
          if (nextState.objects) this.mapData.objects = [...nextState.objects];
          this.renderMap();
        }
      }

      public toggleGrid(show: boolean, blockW: number, blockH: number) {
        if (!this.gridGraphics) {
          this.gridGraphics = this.add.graphics();
          this.gridGraphics.setDepth(100);
        }

        this.gridGraphics.clear();

        if (show && this.mapData) {
          this.gridGraphics.lineStyle(1, 0x888888, 0.5);
          const mapWidth = this.mapData.width * blockW;
          const mapHeight = this.mapData.height * blockH;

          this.gridGraphics.beginPath();
          for (let x = 0; x <= mapWidth; x += blockW) {
            this.gridGraphics.moveTo(x, 0);
            this.gridGraphics.lineTo(x, mapHeight);
          }

          for (let y = 0; y <= mapHeight; y += blockH) {
            this.gridGraphics.moveTo(0, y);
            this.gridGraphics.lineTo(mapWidth, y);
          }

          this.gridGraphics.strokePath();
        }
      }

      public resizeMapData(newW: number, newH: number) {
        if (!this.mapData) return;
        const oldW = this.mapData.width;
        const oldH = this.mapData.height;
        const newTiles = Array(newW * newH).fill(2); // default grass
        const newObjects = Array(newW * newH).fill(-1);

        for (let y = 0; y < Math.min(oldH, newH); y++) {
          for (let x = 0; x < Math.min(oldW, newW); x++) {
            newTiles[y * newW + x] = this.mapData.tiles[y * oldW + x];
            if (this.mapData.objects && this.mapData.objects.length > 0) {
              newObjects[y * newW + x] = this.mapData.objects[y * oldW + x] !== undefined ? this.mapData.objects[y * oldW + x] : -1;
            }
          }
        }

        this.mapData.width = newW;
        this.mapData.height = newH;
        this.mapData.tiles = newTiles;
        this.mapData.objects = newObjects;

        this.undoStack = [];
        this.redoStack = [];
        this.renderMap();
      }

      public async loadNewMap(id: string) {
        try {
          const res = await fetch(`/api/map?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            this.mapData = data.map_data ? data.map_data : data;
            this.undoStack = [];
            this.redoStack = [];
            this.renderMap();
            window.dispatchEvent(new CustomEvent('mapLoaded', {
              detail: {
                width: this.mapData.width,
                height: this.mapData.height,
                block_width: this.mapData.block_width || 32,
                block_height: this.mapData.block_height || 32
              }
            }));
          }
        } catch (err) {
          console.error('Failed to load map', err);
        }
      }

      preload() {
        this.load.image('player_img', `/assets/players/${roleWalkSprite}?t=${Date.now()}`);
        this.load.image('player_atk_img', `/assets/players/${roleAtkSprite}?t=${Date.now()}`);
      }

      private getOrLoadTexture(spriteKey: string, imgUrl: string, onComplete: () => void) {
        if (this.textures.exists(spriteKey)) {
          onComplete();
        } else {
          this.load.image(spriteKey + '_raw', imgUrl);
          this.load.once(`filecomplete-image-${spriteKey + '_raw'}`, () => {
            this.processImage(spriteKey + '_raw', spriteKey);
            onComplete();
          });
          this.load.start();
        }
      }

      private processImage(imgKey: string, spriteKey: string) {
        if (this.textures.exists(imgKey)) {
          const img = this.textures.get(imgKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          if (img && img.width > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);

            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              const bgR = data[0], bgG = data[1], bgB = data[2], bgA = data[3];
              const tolerance = 30;

              if (bgA > 10) {
                for (let i = 0; i < data.length; i += 4) {
                  if (Math.abs(data[i] - bgR) <= tolerance &&
                    Math.abs(data[i + 1] - bgG) <= tolerance &&
                    Math.abs(data[i + 2] - bgB) <= tolerance) {
                    data[i + 3] = 0;
                  }
                }
                ctx.putImageData(imageData, 0, 0);
              }
            } catch (e) {
              console.warn('Could not process image transparency', e);
            }

            const frameWidth = img.width / 3;
            const frameHeight = img.height / 4;

            if (this.textures.exists(spriteKey)) {
              this.textures.remove(spriteKey);
            }

            this.textures.addSpriteSheet(spriteKey, canvas as unknown as HTMLImageElement, {
              frameWidth: frameWidth,
              frameHeight: frameHeight
            });
          }
        }
      }

      async create() {
        this.processImage('player_img', 'player');
        this.processImage('player_atk_img', 'player_atk');

        this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 8, repeat: -1 });

        this.anims.create({ key: 'atk-down', frames: this.anims.generateFrameNumbers('player_atk', { start: 0, end: 2 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-left', frames: this.anims.generateFrameNumbers('player_atk', { start: 3, end: 5 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-up', frames: this.anims.generateFrameNumbers('player_atk', { start: 6, end: 8 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-right', frames: this.anims.generateFrameNumbers('player_atk', { start: 9, end: 11 }), frameRate: 12, repeat: 0 });

        this.cursors = this.input.keyboard!.createCursorKeys();

        try {
          const res = await fetch('/api/map');
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data ? data.map_data : data;
        } catch (err) {
          console.error('Failed to load map', err);
          this.mapData = { width: 40, height: 40, tiles: Array(40 * 40).fill(0) };
        }

        if (isDestroyed || !this.sys || !this.sys.game) return;

        this.input.mouse!.disableContextMenu();


        const performZoom = (newZoom: number, pointerX: number, pointerY: number) => {
          if (this.cameras.main.zoom === newZoom) return;
          const worldPoint = this.cameras.main.getWorldPoint(pointerX, pointerY);

          if (!this.isEditor) {
            this.cameras.main.stopFollow();
          }

          this.cameras.main.setZoom(newZoom);

          const newWorldPoint = this.cameras.main.getWorldPoint(pointerX, pointerY);
          this.cameras.main.scrollX -= newWorldPoint.x - worldPoint.x;
          this.cameras.main.scrollY -= newWorldPoint.y - worldPoint.y;
        };

        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
          if (pointer.y >= this.scale.height - 80 && this.isEditor) return; // Editor UI
          let newZoom = this.cameras.main.zoom - deltaY * 0.001;
          newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
          performZoom(newZoom, pointer.x, pointer.y);
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
            this.initialZoomDistance = Phaser.Math.Distance.Between(
              this.input.pointer1.x, this.input.pointer1.y,
              this.input.pointer2.x, this.input.pointer2.y
            );
            this.initialZoom = this.cameras.main.zoom;
            // Disable joystick when pinching
            this.joystickActive = false;
            if (this.joystickBase) this.joystickBase.setVisible(false);
            if (this.joystickGraphics) this.joystickGraphics.setVisible(false);
            if (this.joystickThumb) this.joystickThumb.setVisible(false);
            this.joystickVector.reset();
          }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
            const currentDistance = Phaser.Math.Distance.Between(
              this.input.pointer1.x, this.input.pointer1.y,
              this.input.pointer2.x, this.input.pointer2.y
            );

            if (this.initialZoomDistance > 0) {
              const zoomFactor = currentDistance / this.initialZoomDistance;
              let newZoom = this.initialZoom * zoomFactor;
              newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);

              const midX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
              const midY = (this.input.pointer1.y + this.input.pointer2.y) / 2;
              performZoom(newZoom, midX, midY);
            }
          }
        });

        this.input.on('pointerup', () => {
          if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) {
            this.initialZoomDistance = 0;
          }
        });


        if (this.isEditor) {
          this.renderMap();
          this.setupEditorUI();

          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.editorMode === 'move' || pointer.middleButtonDown() || pointer.rightButtonDown()) {
              this.isPanning = true;
              this.panStart.set(pointer.x, pointer.y);
              this.camStart.set(this.cameras.main.scrollX, this.cameras.main.scrollY);
              return;
            }

            this.undoStack.push({
              tiles: [...this.mapData.tiles],
              objects: this.mapData.objects ? [...this.mapData.objects] : []
            });
            this.redoStack = [];

            this.handlePointerDown(pointer);
          });

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isPanning && (this.editorMode === 'move' || pointer.middleButtonDown() || pointer.rightButtonDown())) {
              const dx = pointer.x - this.panStart.x;
              const dy = pointer.y - this.panStart.y;
              this.cameras.main.scrollX = this.camStart.x - dx / this.cameras.main.zoom;
              this.cameras.main.scrollY = this.camStart.y - dy / this.cameras.main.zoom;
              return;
            }

            if (this.editorMode === 'draw' && pointer.isDown && !pointer.middleButtonDown() && !pointer.rightButtonDown()) {
              this.handlePointerDown(pointer);
            }
          });

          this.input.on('pointerup', () => {
            this.isPanning = false;
          });

        } else {
          this.player = this.physics.add.sprite(100, 100, 'player', 1);

          if (this.textures.exists('player_img')) {
            const img = this.textures.get('player_img').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
            if (img && img.height > 0) {
              const scale = 64 / (img.height / 4);
              this.player.setScale(scale);

              const bodyWidth = (img.width / 3) * 0.4;
              const bodyHeight = (img.height / 4) * 0.3;
              this.player.body!.setSize(bodyWidth, bodyHeight);
              this.player.body!.setOffset((img.width / 3 - bodyWidth) / 2, (img.height / 4) - bodyHeight - 5);
            }
          }

          this.player.setCollideWorldBounds(true);
          this.player.setDepth(10);

          this.renderMap();

          const addNameTag = (id: string, name: string, sprite: Phaser.Physics.Arcade.Sprite, isNpc: boolean = false) => {
            const color = isNpc ? '#fde047' : '#ffffff';
            const nameTag = this.add.text(sprite.x, sprite.y - 40, name, {
              fontSize: '12px', color: color, backgroundColor: '#00000088', padding: { x: 4, y: 2 }
            }).setOrigin(0.5, 0.5).setDepth(20);
            this.nameTags[id] = nameTag;
          };

          socket.on('current_players', (players: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            Object.keys(players).forEach(id => {
              if (id !== socket.id && players[id].isRpg) {
                this.addOtherPlayer(id, players[id]);
              } else if (id === socket.id && players[id].isRpg) {
                this.player!.setPosition(players[id].x, players[id].y);
                addNameTag(id, playerName, this.player!);
              }
            });
          });

          socket.on('current_npcs', (npcsData: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            Object.keys(npcsData).forEach(id => {
              this.addNpc(id, npcsData[id]);
            });
          });

          socket.on('npc_created', (npc: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            this.addNpc(npc.id, npc);
          });

          socket.on('npc_updated', (npc: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            if (this.npcs[npc.id]) {
              this.npcs[npc.id].setPosition(npc.x, npc.y);
              if (this.nameTags[npc.id]) {
                this.nameTags[npc.id].setText(npc.name);
                this.nameTags[npc.id].setPosition(npc.x, npc.y - 40);
              }
            } else {
              this.addNpc(npc.id, npc);
            }
          });

          socket.on('npc_deleted', (data: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            if (this.npcs[data.id]) {
              this.npcs[data.id].destroy();
              delete this.npcs[data.id];
            }
            if (this.nameTags[data.id]) {
              this.nameTags[data.id].destroy();
              delete this.nameTags[data.id];
            }
          });

          socket.on('player_joined', (player: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            if (player.isRpg) {
              this.addOtherPlayer(player.id, player);
            }
          });

          socket.on('chat_message', (msg: ChatMessage) => {
            msg.timestamp = Date.now();
            onChatReceived(msg);

            if (isDestroyed || !this.sys || !this.sys.game) return;
            const isSelf = msg.id === socket.id;
            this.showChatBubble(msg.id, msg.message, isSelf);
          });

          socket.on('player_moved', (player: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            const other = this.otherPlayers[player.id];
            if (other) {
              other.setPosition(player.x, player.y);

              let targetAnim = player.anim;
              const spriteKey = `player_${player.role_walk_sprite}`;
              if (targetAnim && targetAnim.startsWith('walk-')) {
                targetAnim = `${spriteKey}-${targetAnim}`;
              }

              if (targetAnim && other.anims.exists(targetAnim)) {
                other.anims.play(targetAnim, true);
              } else {
                other.anims.stop();
                if (player.frame !== undefined) other.setFrame(player.frame);
              }
              if (this.nameTags[player.id]) {
                this.nameTags[player.id].setPosition(player.x, player.y - 40);
              }
              if (this.chatBubbles[player.id]) {
                this.chatBubbles[player.id].setPosition(player.x, player.y - 65);
              }
            }
          });

          socket.on('player_left', (id: string) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            if (this.otherPlayers[id]) {
              this.otherPlayers[id].destroy();
              delete this.otherPlayers[id];
            }
            if (this.nameTags[id]) {
              this.nameTags[id].destroy();
              delete this.nameTags[id];
            }
            if (this.chatBubbles[id]) {
              this.chatBubbles[id].destroy();
              delete this.chatBubbles[id];
            }
            if (this.chatTimers[id]) {
              this.chatTimers[id].remove();
              delete this.chatTimers[id];
            }
          });

          // Connect as RPG player
          socket.emit('rpg_connect', {
            name: playerName,
            roleWalkSprite: roleWalkSprite,
            roleAtkSprite: roleAtkSprite
          });

          this.joystickBase = this.add.circle(0, 0, 60, 0x000000, 0.3).setScrollFactor(0).setDepth(1000).setVisible(false);

          this.joystickGraphics = this.add.graphics().setScrollFactor(0).setDepth(1000).setVisible(false);

          this.joystickThumb = this.add.circle(0, 0, 30, 0xffffff, 0.6).setScrollFactor(0).setDepth(1001).setVisible(false);

          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            if (this.isEditor) return;
            if (gameObjects.length > 0) return; // Ignore if clicked on UI elements
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) return; // Pinch to zoom in progress

            this.joystickActive = true;
            this.joystickBase!.setPosition(pointer.x, pointer.y).setVisible(true);
            this.joystickThumb!.setPosition(pointer.x, pointer.y).setVisible(true);

            this.joystickGraphics!.clear();
            this.joystickGraphics!.lineStyle(6, 0xffffff, 0.2);
            this.joystickGraphics!.beginPath();
            this.joystickGraphics!.moveTo(pointer.x - 40, pointer.y);
            this.joystickGraphics!.lineTo(pointer.x + 40, pointer.y);
            this.joystickGraphics!.moveTo(pointer.x, pointer.y - 40);
            this.joystickGraphics!.lineTo(pointer.x, pointer.y + 40);
            this.joystickGraphics!.strokePath();
            this.joystickGraphics!.setVisible(true);

            this.updateJoystick(pointer);
          });

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.joystickActive) {
              this.updateJoystick(pointer);
            }
          });

          const resetJoystick = () => {
            this.joystickActive = false;
            if (this.joystickBase) this.joystickBase.setVisible(false);
            if (this.joystickGraphics) this.joystickGraphics.setVisible(false);
            if (this.joystickThumb) this.joystickThumb.setVisible(false);
            this.joystickVector.reset();
          };
          this.input.on('pointerup', resetJoystick);
          this.input.on('gameout', resetJoystick);

          this.input.keyboard!.on('keydown-SPACE', () => this.triggerAttack());
        }

        socket.on('map_updated', (newMapData: any) => {
          if (isDestroyed || !this.sys || !this.sys.game) return;
          this.mapData = newMapData;
          this.renderMap();
        });

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
          if (isDestroyed) return;
          const { width, height } = gameSize;

          if (this.infoText) {
            this.infoText.setPosition(width - 10, 10);
          }



          if (!this.isEditor && this.player) {
            this.cameras.main.setZoom(1);
            this.cameras.main.centerOn(this.player.x, this.player.y);
            this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
          }

          if (this.isEditor) {
            // Let's reposition editor UI at bottom
            // The old UI is at y=520, but we need to update it to use height
            // For now we'll just adjust the infoText. Editor UI will need more advanced repositioning if we care, but RpgMode edit isn't the main issue.
          }
        });
      }

      showChatBubble(id: string, text: string, isSelf: boolean) {
        if (this.chatBubbles[id]) {
          this.chatBubbles[id].destroy();
        }
        if (this.chatTimers[id]) {
          this.chatTimers[id].remove();
        }

        const targetSprite = isSelf ? this.player : this.otherPlayers[id];
        if (!targetSprite) return;

        const container = this.add.container(targetSprite.x, targetSprite.y - 65).setDepth(30);

        const chatText = this.add.text(0, -5, text, {
          fontSize: '12px',
          color: '#000000',
          backgroundColor: '#ffffff',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 120 }
        }).setOrigin(0.5, 1);

        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillTriangle(-5, -5, 5, -5, 0, 0);

        container.add([chatText, graphics]);
        this.chatBubbles[id] = container;

        this.chatTimers[id] = this.time.delayedCall(4000, () => {
          if (this.chatBubbles[id]) {
            this.chatBubbles[id].destroy();
            delete this.chatBubbles[id];
          }
          if (this.chatTimers[id]) {
            delete this.chatTimers[id];
          }
        });
      }

      public triggerAttack() {
        if (this.actionMode !== 'attack' || this.isAttacking || !this.player) return;
        this.isAttacking = true;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
        const animKey = `atk-${this.currentDirection}`;
        this.player.anims.play(animKey, true);

        socketRef.current?.emit('player_moved', {
          x: this.player.x,
          y: this.player.y,
          anim: animKey,
          frame: this.player.frame.name
        });

        this.player.once('animationcomplete', () => {
          this.isAttacking = false;
          if (this.currentDirection === 'left') this.player!.setFrame(4);
          else if (this.currentDirection === 'right') this.player!.setFrame(10);
          else if (this.currentDirection === 'up') this.player!.setFrame(7);
          else this.player!.setFrame(1);

          socketRef.current?.emit('player_moved', {
            x: this.player!.x,
            y: this.player!.y,
            anim: null,
            frame: this.player!.frame.name
          });
        });
      }

      updateJoystick(pointer: Phaser.Input.Pointer) {
        if (!this.joystickBase || !this.joystickThumb) return;
        const angle = Phaser.Math.Angle.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        let dist = Phaser.Math.Distance.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        const maxDist = 60;
        if (dist > maxDist) dist = maxDist;

        this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * dist;
        this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * dist;

        this.joystickVector.x = (this.joystickThumb.x - this.joystickBase.x) / maxDist;
        this.joystickVector.y = (this.joystickThumb.y - this.joystickBase.y) / maxDist;
      }

      addOtherPlayer(id: string, player: any) {
        const spriteKey = `player_${player.role_walk_sprite}`;
        this.getOrLoadTexture(spriteKey, `/assets/players/${player.role_walk_sprite}`, () => {
          if (!this.sys || !this.sys.game) return;
          const other = this.physics.add.sprite(player.x, player.y, spriteKey, player.frame !== undefined ? player.frame : 1);

          const img = this.textures.get(spriteKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          if (img && img.height > 0) {
            other.setScale(64 / (img.height / 4));
          }

          if (!this.anims.exists(`${spriteKey}-walk-down`)) {
            this.anims.create({ key: `${spriteKey}-walk-down`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${spriteKey}-walk-left`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${spriteKey}-walk-up`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${spriteKey}-walk-right`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
          }

          other.setTint(0xffdddd);
          other.setDepth(10);

          let targetAnim = player.anim;
          if (targetAnim && targetAnim.startsWith('walk-')) {
            targetAnim = `${spriteKey}-${targetAnim}`;
          }

          if (targetAnim && this.anims.exists(targetAnim)) other.anims.play(targetAnim, true);
          this.otherPlayers[id] = other;

          const nameTag = this.add.text(player.x, player.y - 40, player.name || 'Player', {
            fontSize: '12px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 4, y: 2 }
          }).setOrigin(0.5, 0.5).setDepth(20);
          this.nameTags[id] = nameTag;
        });
      }

      addNpc(id: string, npc: any) {
        const spriteKey = `npc_${npc.role_walk_sprite}`;
        this.getOrLoadTexture(spriteKey, `/assets/players/${npc.role_walk_sprite}`, () => {
          if (!this.sys || !this.sys.game) return;
          const npcSprite = this.physics.add.sprite(npc.x, npc.y, spriteKey, 1);

          const img = this.textures.get(spriteKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          if (img && img.height > 0) {
            npcSprite.setScale(64 / (img.height / 4));
          }
          npcSprite.setDepth(9);
          this.npcs[id] = npcSprite;

          const nameTag = this.add.text(npc.x, npc.y - 40, npc.name || 'NPC', {
            fontSize: '12px', color: '#fde047', backgroundColor: '#00000088', padding: { x: 4, y: 2 }
          }).setOrigin(0.5, 0.5).setDepth(20);
          this.nameTags[id] = nameTag;
        });
      }

      renderMap() {
        if (!this.mapData) return;

        const data2D: number[][] = [];
        for (let y = 0; y < this.mapData.height; y++) {
          const row: number[] = [];
          for (let x = 0; x < this.mapData.width; x++) {
            row.push(this.mapData.tiles[y * this.mapData.width + x] + 1);
          }
          data2D.push(row);
        }

        if (this.layer) {
          this.layer.destroy();
        }
        if (this.objectLayer) {
          this.objectLayer.destroy();
        }
        if (this.tilemap) {
          this.tilemap.destroy();
        }

        this.tilemap = this.make.tilemap({ data: data2D, tileWidth: 32, tileHeight: 32 });

        const setupLayers = () => {
          if (!this.tileset || !this.tilemap) return;
          this.layer = this.tilemap.createLayer(0, this.tileset, 0, 0)!;
          this.layer.setDepth(0);
          this.layer.setCollision([2, 3]);
          if (this.player) {
            this.physics.add.collider(this.player, this.layer);
          }

          // Create object layer
          this.objectLayer = this.tilemap.createBlankLayer('object_layer', this.tileset, 0, 0)!;
          this.objectLayer.setDepth(1);
          if (this.mapData.objects) {
            for (let y = 0; y < this.mapData.height; y++) {
              for (let x = 0; x < this.mapData.width; x++) {
                const objVal = this.mapData.objects[y * this.mapData.width + x];
                if (objVal !== undefined && objVal !== -1) {
                  this.objectLayer.putTileAt(objVal + 1, x, y);
                }
              }
            }
          }
        };

        // Dynamically load tileset if not loaded yet
        const loadAndRenderTileset = (imgUrl: string, key: string) => {
          if (!this.textures.exists(key)) {
            this.load.image(key, imgUrl);
            this.load.once(`filecomplete-image-${key}`, () => {
              this.tileset = this.tilemap!.addTilesetImage(key, key, 32, 32, 0, 0);
              setupLayers();
            });
            this.load.start();
          } else {
            this.tileset = this.tilemap!.addTilesetImage(key, key, 32, 32, 0, 0);
            setupLayers();
          }
        };

        // We assume active tileset info is stored globally or default to cute
        const activeTileset = (window as any).__ACTIVE_TILESET__;
        if (activeTileset && activeTileset.image_source) {
          // Fix: Ensure the path handles raw PNG names from JSON properly
          let src = activeTileset.image_source;
          // Some maps specify the filename, some might just say "cute_tileset"
          if (!src.endsWith('.png')) {
            src += '.png';
          }
          // The JSON says "image_0.png" but we know the actual image might be cute_tileset.png
          // Let's assume the server has cute_tileset.png and we want to load it
          // A robust way: The name of the file comes from the name of the active tileset or we hardcode for now
          // In the real world, the tileset JSON filename usually matches the PNG filename
          // Let's fallback gracefully to the known working image if activeTileset isn't populated properly
          const imgUrl = `/assets/map_tileset/${activeTileset.name}.png`.replace('_512x256', '');
          // Note: our file is cute_tileset.png
          // For simplicity, hardcode to cute_tileset.png if name contains cute, else try generic
          const finalUrl = activeTileset.name.includes('cute') ? '/assets/map_tileset/cute_tileset.png' : `/assets/map_tileset/${src}`;

          const key = `tileset_${activeTileset.name}`;
          loadAndRenderTileset(finalUrl, key);
        } else {
          // Fallback
          loadAndRenderTileset('/assets/map_tileset/cute_tileset.png', 'tileset_cute_rpg');
        }

        this.physics.world.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);
        this.cameras.main.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);

        if (!this.isEditor && this.player) {
          this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        }
      }

      setupEditorUI() {
        this.input.keyboard!.on('keydown-ONE', () => { this.currentTileType = 0; });
        this.input.keyboard!.on('keydown-TWO', () => { this.currentTileType = 48; });
        this.input.keyboard!.on('keydown-THREE', () => { this.currentTileType = 94; });
      }

      updateSelectorText() {
        // Replaced by sidebars
      }

      handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (!this.mapData) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileSize = 32;
        const x = Math.floor(worldPoint.x / tileSize);
        const y = Math.floor(worldPoint.y / tileSize);

        if (x >= 0 && x < this.mapData.width && y >= 0 && y < this.mapData.height) {
          const index = y * this.mapData.width + x;
          const targetVal = this.isEraser ? -1 : this.currentTileType - 1;

          if (this.currentEditLayer === 'ground') {
            if (this.mapData.tiles[index] !== targetVal) {
              this.mapData.tiles[index] = targetVal;
              if (this.layer) {
                if (targetVal === -1) this.layer.removeTileAt(x, y);
                else this.layer.putTileAt(targetVal + 1, x, y);
              }
            }
          } else {
            if (!this.mapData.objects) this.mapData.objects = Array(this.mapData.width * this.mapData.height).fill(-1);
            if (this.mapData.objects[index] !== targetVal) {
              this.mapData.objects[index] = targetVal;
              if (this.objectLayer) {
                if (targetVal === -1) this.objectLayer.removeTileAt(x, y);
                else this.objectLayer.putTileAt(targetVal + 1, x, y);
              }
            }
          }
        }
      }

      update(time: number, delta: number) {
        if (infoTextRef.current) {
          if (this.isEditor) {
            const cam = this.cameras.main;
            const pointer = this.input.activePointer;
            const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);
            const tileSize = this.mapData?.block_width || 32;
            const col = Math.floor(worldPoint.x / tileSize) + 1;
            const row = Math.floor(worldPoint.y / tileSize) + 1;
            const pointerPos = `Pos: Col ${col}, Row ${row}`;

            // Placeholder for future ID and Debug metadata based on grid position
            const idText = "ID: ";
            const debugText = "Debug: ";

            infoTextRef.current.innerText = `Map: ${mapName}\nCam: (${Math.floor(cam.scrollX / tileSize)}, ${Math.floor(cam.scrollY / tileSize)})\n${pointerPos}\n${idText}\n${debugText}`;
          } else if (this.player && infoTextRef.current) {
            const zoom = this.cameras.main.zoom.toFixed(2);
            infoTextRef.current.innerText = `Map: ${mapName}\nPos: (${Math.floor(this.player.x / 32)}, ${Math.floor(this.player.y / 32)})\nZoom: ${zoom}x`;
          }
        }

        if (this.isEditor) {
          const camSpeed = 10 / this.cameras.main.zoom;
          if (this.cursors?.left.isDown) this.cameras.main.scrollX -= camSpeed;
          else if (this.cursors?.right.isDown) this.cameras.main.scrollX += camSpeed;

          if (this.cursors?.up.isDown) this.cameras.main.scrollY -= camSpeed;
          else if (this.cursors?.down.isDown) this.cameras.main.scrollY += camSpeed;
          return;
        }

        if (!this.player || !this.cursors) return;

        if (!this.isAttacking && this.actionMode === 'attack') {
          if (this.cursors.space.isDown || this.attackButtonDown) {
            this.triggerAttack();
          }
        }

        if (this.isAttacking) return;

        const speed = 150;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        let moved = false;
        let currentAnim = null;

        let moveX = 0;
        let moveY = 0;
        const threshold = 0.3;

        if (this.cursors.left.isDown) moveX = -1;
        else if (this.cursors.right.isDown) moveX = 1;
        else if (Math.abs(this.joystickVector.x) > threshold) moveX = this.joystickVector.x;

        if (this.cursors.up.isDown) moveY = -1;
        else if (this.cursors.down.isDown) moveY = 1;
        else if (Math.abs(this.joystickVector.y) > threshold) moveY = this.joystickVector.y;

        if (moveX !== 0 || moveY !== 0) {
          moved = true;
          const vec = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(speed);
          body.setVelocity(vec.x, vec.y);

          if (Math.abs(moveX) > Math.abs(moveY)) {
            currentAnim = moveX < 0 ? 'walk-left' : 'walk-right';
            this.currentDirection = moveX < 0 ? 'left' : 'right';
          } else {
            currentAnim = moveY < 0 ? 'walk-up' : 'walk-down';
            this.currentDirection = moveY < 0 ? 'up' : 'down';
          }
        }

        let justStopped = false;
        if (moved) {
          this.player.anims.play(currentAnim!, true);
          this.lastAnim = currentAnim;

          if (!this.isEditor && this.player) {
            this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
          }
        } else {
          if (this.player.anims.isPlaying) {
            justStopped = true;
          }
          this.player.anims.stop();
          if (this.currentDirection === 'left') this.player.setFrame(4);
          else if (this.currentDirection === 'right') this.player.setFrame(10);
          else if (this.currentDirection === 'up') this.player.setFrame(7);
          else this.player.setFrame(1);
        }

        if (moved || justStopped) {
          socket.emit('player_moved', {
            x: this.player.x,
            y: this.player.y,
            anim: moved ? currentAnim : null,
            frame: this.player.frame.name
          });
          if (socketRef.current && socketRef.current.id) {
            const sid = socketRef.current.id;
            if (this.nameTags[sid]) {
              this.nameTags[sid].setPosition(this.player.x, this.player.y - 40);
            }
            if (this.chatBubbles[sid]) {
              this.chatBubbles[sid].setPosition(this.player.x, this.player.y - 65);
            }
          }
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: gameRef.current,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
      },
      audio: {
        noAudio: true
      },
      input: {
        activePointers: 3,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: MainScene
    };

    phaserGameRef.current = new Phaser.Game(config);
    phaserGameRef.current.scene.start('MainScene', { mode });

    return () => {
      isDestroyed = true;
      socket.disconnect();
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
      }
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full">
      <div ref={gameRef} className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl" />
      <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-[1000]">
        <div ref={infoTextRef} className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded whitespace-pre text-left font-mono"></div>
      </div>
    </div>
  );
}

export default function RpgMapEditor({ onBack }: RpgModeProps) {
  const mode = 'edit' as const;
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const { roles, selectedRoleId, user } = useAppStore() as any; // Cast to any to get user if it's there or just use localstorage

  // Try to get user from global if possible, otherwise fallback
  const [playerName, setPlayerName] = useState(user?.name || 'Player');
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [mapsList, setMapsList] = useState<{ id: string, name: string }[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('main_200');
  const [currentMapName, setCurrentMapName] = useState<string>('World Map');
  const [selectedTile, setSelectedTile] = useState<number>(2);
  const [editLayer, setEditLayer] = useState<'ground' | 'object'>('ground');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [resizeWidth, setResizeWidth] = useState<number>(40);
  const [resizeHeight, setResizeHeight] = useState<number>(40);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [blockWidth, setBlockWidth] = useState<number>(32);
  const [blockHeight, setBlockHeight] = useState<number>(32);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<'draw' | 'move'>('draw');

  const [tilesets, setTilesets] = useState<any[]>([]);
  const [activeTileset, setActiveTileset] = useState<any>(null);
  const [selectedTileData, setSelectedTileData] = useState<any>(null);

  useEffect(() => {
    // Notify Phaser scene when grid settings change
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.toggleGrid) {
      scene.toggleGrid(showGrid, blockWidth, blockHeight);
    }
  }, [showGrid, blockWidth, blockHeight]);

  const loadTilesets = () => {
    fetch('/api/map/tilesets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTilesets(data);
          setActiveTileset(data[0]);
          (window as any).__ACTIVE_TILESET__ = data[0];
          if (data[0].tiles && data[0].tiles.length > 0) {
            setSelectedTileData(data[0].tiles[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch tilesets', err));
  };

  useEffect(() => {
    loadTilesets();
  }, []);

  const handleTilesetChange = (ts: any) => {
    setActiveTileset(ts);
    (window as any).__ACTIVE_TILESET__ = ts;
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene) {
      scene.renderMap();
    }
  };

  useEffect(() => {
    const handleTileChange = (e: any) => setSelectedTile(e.detail);
    const handleMapLoaded = (e: any) => {
      setResizeWidth(e.detail.width);
      setResizeHeight(e.detail.height);
      if (e.detail.block_width) setBlockWidth(e.detail.block_width);
      if (e.detail.block_height) setBlockHeight(e.detail.block_height);
    };
    window.addEventListener('tileTypeChanged', handleTileChange);
    window.addEventListener('mapLoaded', handleMapLoaded);
    return () => {
      window.removeEventListener('tileTypeChanged', handleTileChange);
      window.removeEventListener('mapLoaded', handleMapLoaded);
    };
  }, []);

  const handleUndo = () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.performUndo) scene.performUndo();
  };

  const handleRedo = () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.performRedo) scene.performRedo();
  };

  const handleResizeMap = async () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.resizeMapData) {
      scene.resizeMapData(resizeWidth, resizeHeight);
      await handleSaveMap(); // Save automatically as requested
    }
  };

  const handleLayerToggle = (layer: 'ground' | 'object') => {
    setEditLayer(layer);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene) scene.currentEditLayer = layer;
  };

  const handleEraserToggle = () => {
    const newVal = !isEraser;
    setIsEraser(newVal);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene) scene.isEraser = newVal;
  };

  const fetchMaps = async () => {
    try {
      const res = await fetch('/api/maps');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMapsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch maps', err);
    }
  };

  const handleSaveMap = async () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    const mapData = scene?.mapData;
    if (!mapData) return;

    // Ensure block sizes are synced before saving
    mapData.block_width = blockWidth;
    mapData.block_height = blockHeight;

    try {
      const res = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentMapId, name: currentMapName, map_data: mapData })
      });
      if (res.ok) {
        alert('Map Saved Successfully!');
        await fetchMaps();
        if (scene && scene.loadNewMap) {
          await scene.loadNewMap(currentMapId);
        }
      }
      else alert('Failed to save map');
    } catch (err) {
      console.error(err);
      alert('Error saving map');
    }
  };

  const getTileName = (id: number) => {
    if (id === 2) return 'Grass';
    if (id === 48) return 'Water';
    if (id === 94) return 'Mountain';
    return 'Unknown';
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentMapId(newId);
    const mapObj = mapsList.find(m => m.id === newId);
    if (mapObj) setCurrentMapName(mapObj.name);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.loadNewMap) {
      scene.loadNewMap(newId).then(() => {
        if (scene.mapData) {
          setResizeWidth(scene.mapData.width);
          setResizeHeight(scene.mapData.height);
        }
      });
    }
  };

  const handleMapRename = async () => {
    const newName = prompt('Enter new map name:', currentMapName);
    if (!newName || newName.trim() === '') return;

    try {
      const scene = (window as any).__PHASER_MAIN_SCENE__;
      const mapData = scene?.mapData;
      if (!mapData) return;

      // Ensure block sizes are synced before saving
      mapData.block_width = blockWidth;
      mapData.block_height = blockHeight;

      const res = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentMapId, name: newName, map_data: mapData })
      });
      if (res.ok) {
        setCurrentMapName(newName);
        setMapsList(prev => prev.map(m => m.id === currentMapId ? { ...m, name: newName } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMap = async () => {
    try {
      const res = await fetch('/api/map/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Generated Map', width: resizeWidth, height: resizeHeight, block_width: blockWidth, block_height: blockHeight })
      });
      if (res.ok) {
        const data = await res.json();
        setMapsList(prev => [...prev, { id: data.id, name: data.name }]);
        setCurrentMapId(data.id);
        setCurrentMapName(data.name);
        const scene = (window as any).__PHASER_MAIN_SCENE__;
        if (scene && scene.loadNewMap) {
          scene.loadNewMap(data.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    // Check if fullscreen is supported and not already active
    const checkFullscreen = () => {
      // Check if already in standalone mode (added to home screen on iOS/Android)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        return; // No need to prompt if already running as an app
      }

      const doc = document as any;
      const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

      // Check if fullscreen API is supported at all
      const isSupported = document.fullscreenEnabled || doc.webkitFullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled;

      // On iOS Safari/Chrome, the fullscreen API on document.documentElement is usually not supported
      if (!isSupported) {
        setIsFullscreenSupported(false);
      }

      const enableFullScreenNotification = import.meta.env.VITE_ENABLE_FULL_SCREEN_NOTIFICATION === 'true';

      if (!isFullscreen && enableFullScreenNotification) {
        setShowFullscreenPrompt(true);
      }
    };
    checkFullscreen();

    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      setIsFullscreenActive(!!isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as any;
    const isFullscreen = document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      requestFullscreen();
    }
  };

  const requestFullscreen = async () => {
    const elem = document.documentElement as any;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        /* Safari */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        /* IE11 */
        elem.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed or was denied:', err);
    }
    setShowFullscreenPrompt(false);
  };

  useEffect(() => {
    // Fetch user profile for nickname
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setPlayerName(data.profile?.nickname || data.user?.name || 'Player');
        }
      })
      .catch(err => console.error(err));
  }, []);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || {
    role_walk_sprite: 'character.png',
    role_atk_sprite: 'character_atk.png'
  };

  const handleChatReceived = (msg: ChatMessage) => {
    setChatMessages(prev => [...prev.slice(-49), msg]); // Keep last 50 messages
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech recognition
    const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setSpeechSupported(isSupported);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !socketInstance) return;

    // Send via socket
    socketInstance.emit('chat_message', { message: currentMessage });
    setCurrentMessage('');
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col font-sans w-full absolute inset-0 z-50">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center group relative"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">返回</span>
          </button>

          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className={`p-2 transition-colors rounded-lg group relative ${showLeftSidebar ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'}`}
            title="Toggle Left Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className={`p-2 transition-colors rounded-lg group relative ${showRightSidebar ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'}`}
            title="Toggle Right Sidebar"
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700 group relative"
            title={isFullscreenActive ? "退出全螢幕" : "進入全螢幕"}
          >
            {isFullscreenActive ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
              {isFullscreenActive ? "退出全螢幕" : "進入全螢幕"}
            </span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700 group relative"
            title="重整"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">重整</span>
          </button>


          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700 group relative"
            title="設定"
          >
            <Settings className="w-5 h-5" />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">設定</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative w-full bg-slate-900">


        <div className="flex-1 w-full flex flex-row gap-2 md:gap-4 min-h-0">

          {showLeftSidebar && (
            <div className="w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col shrink-0">
              <div className="bg-slate-900 border-b border-slate-700 p-2 text-white font-bold text-center flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Tilesets</span>
                  <button onClick={loadTilesets} className="p-1 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700" title="Reload Tilesets">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs font-normal max-w-[120px]"
                  value={activeTileset?.name || ''}
                  onChange={(e) => {
                    const ts = tilesets.find(t => t.name === e.target.value);
                    if (ts) handleTilesetChange(ts);
                  }}
                >
                  {tilesets.map(ts => (
                    <option key={ts.name} value={ts.name}>{ts.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {activeTileset && (
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: activeTileset.total_tiles }).map((_, id) => {
                      const cols = activeTileset.columns;
                      const tw = activeTileset.tilewidth;
                      const th = activeTileset.tileheight;

                      const x = (id % cols) * tw;
                      const y = Math.floor(id / cols) * th;

                      const tileMeta = activeTileset.tiles?.find((t: any) => t.id === id + 1) || {
                        id: id + 1,
                        name: `Tile ${id + 1}`,
                        category: 'unknown',
                        tags: []
                      };

                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedTile(id);
                            setSelectedTileData(tileMeta);
                            const scene = (window as any).__PHASER_MAIN_SCENE__;
                            if (scene) scene.currentTileType = id + 1; // 1-based internal handling
                          }}
                          className={`w-10 h-10 border-2 rounded ${selectedTile === id ? 'border-blue-500 z-10 scale-110 relative' : 'border-transparent hover:border-slate-500'}`}
                          title={tileMeta.name}
                          style={{
                            backgroundImage: `url(/assets/map_tileset/${activeTileset.name.includes('cute') ? 'cute_tileset.png' : activeTileset.image_source})`,
                            backgroundPosition: `-${x}px -${y}px`,
                            backgroundSize: `${cols * tw}px ${Math.ceil(activeTileset.total_tiles / cols) * th}px`,
                            width: `${tw}px`,
                            height: `${th}px`
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0 flex flex-col min-w-0">
            <div className="w-full bg-slate-900 border-b border-slate-700 p-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-[5000] relative">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-white text-sm whitespace-nowrap">Map:</span>
                <select
                  value={currentMapId}
                  onChange={handleMapChange}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1 outline-none"
                >
                  {mapsList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    await fetchMaps();
                    const scene = (window as any).__PHASER_MAIN_SCENE__;
                    if (scene && scene.loadNewMap) {
                      await scene.loadNewMap(currentMapId);
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white p-1 rounded transition-colors group relative"
                  title="Reload Map Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Reload Map Data</span>
                </button>
                <button onClick={handleMapRename} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-colors">
                  Rename
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">
                  <span>W:</span>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(parseInt(e.target.value) || 10)}
                    className="w-12 bg-slate-700 text-white rounded outline-none px-1 text-center"
                    min="10"
                  />
                  <span>H:</span>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(parseInt(e.target.value) || 10)}
                    className="w-12 bg-slate-700 text-white rounded outline-none px-1 text-center"
                    min="10"
                  />
                  <button onClick={handleResizeMap} className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[10px] transition-colors ml-1">
                    Resize & Save
                  </button>
                </div>
                <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">
                  <span className="text-[10px] text-slate-400">Block:</span>
                  <span>W:</span>
                  <input
                    type="number"
                    value={blockWidth}
                    onChange={(e) => setBlockWidth(parseInt(e.target.value) || 32)}
                    className="w-10 bg-slate-700 text-white rounded outline-none px-1 text-center"
                    min="8"
                  />
                  <span>H:</span>
                  <input
                    type="number"
                    value={blockHeight}
                    onChange={(e) => setBlockHeight(parseInt(e.target.value) || 32)}
                    className="w-10 bg-slate-700 text-white rounded outline-none px-1 text-center"
                    min="8"
                  />
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`${showGrid ? 'bg-indigo-600' : 'bg-slate-600'} hover:bg-indigo-500 px-1 py-0.5 rounded transition-colors ml-1`}
                    title="Toggle Grid"
                  >
                    <Grid className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs text-white border border-slate-600 mr-2 gap-2">
                  <button
                    onClick={() => {
                      const newMode = editorMode === 'draw' ? 'move' : 'draw';
                      setEditorMode(newMode);
                      const scene = (window as any).__PHASER_MAIN_SCENE__;
                      if (scene) scene.editorMode = newMode;
                    }}
                    className={`p-1 rounded transition-colors ${editorMode === 'draw' ? 'bg-blue-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                    title={editorMode === 'draw' ? 'Switch to Move Mode' : 'Switch to Draw Mode'}
                  >
                    {editorMode === 'draw' ? <Pencil className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                  </button>
                  <select
                    value={editLayer}
                    onChange={(e) => handleLayerToggle(e.target.value as 'ground' | 'object')}
                    className="bg-slate-700 border border-slate-500 rounded outline-none text-xs px-1 py-0.5"
                  >
                    <option value="ground">Ground</option>
                    <option value="object">Object</option>
                  </select>
                  <button
                    onClick={handleEraserToggle}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${isEraser ? 'bg-red-600' : 'bg-slate-600 hover:bg-slate-500'}`}
                  >
                    Eraser
                  </button>
                </div>
                <button onClick={handleUndo} className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded transition-colors group relative" title="Undo">
                  <Undo2 className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Undo</span>
                </button>
                <button onClick={handleRedo} className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded transition-colors group relative" title="Redo">
                  <Redo2 className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Redo</span>
                </button>
                <button onClick={handleSaveMap} className="bg-amber-600 hover:bg-amber-500 text-white p-1 rounded transition-colors ml-2 shadow-lg group relative" title="Save Map">
                  <Save className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Save Map</span>
                </button>

                <button onClick={async () => {
                  const newId = 'map_' + Date.now();
                  const res = await fetch('/api/map', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: newId,
                      name: 'New Map',
                      map_data: {
                        width: resizeWidth,
                        height: resizeHeight,
                        block_width: blockWidth,
                        block_height: blockHeight,
                        tiles: Array(resizeWidth * resizeHeight).fill(2),
                        objects: Array(resizeWidth * resizeHeight).fill(-1)
                      }
                    })
                  });
                  if (res.ok) {
                    setMapsList(prev => [...prev, { id: newId, name: 'New Map' }]);
                    setCurrentMapId(newId);
                    setCurrentMapName('New Map');
                    const scene = (window as any).__PHASER_MAIN_SCENE__;
                    if (scene && scene.loadNewMap) scene.loadNewMap(newId);
                  }
                }} className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded transition-colors group relative" title="New Empty Map">
                  <FilePlus className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">New Empty Map</span>
                </button>
                <button onClick={handleGenerateMap} className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded transition-colors group relative" title="Generate Random Map">
                  <Sparkles className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Generate Map</span>
                </button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0">
              <PhaserGame
                key={mode}
                mode={mode}
                mapName={currentMapName}
                roleWalkSprite={selectedRole.role_walk_sprite}
                roleAtkSprite={selectedRole.role_atk_sprite}
                playerName={playerName}
                onChatReceived={handleChatReceived}
                onSocketReady={setSocketInstance}
              />
            </div>
          </div>

          {showRightSidebar && (
            <div className="w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col shrink-0">
              <div className="bg-slate-900 border-b border-slate-700 p-2 text-white font-bold text-center">
                Tile Details
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-300">
                {selectedTileData && activeTileset ? (
                  <div className="space-y-4">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                      <div
                        className="mb-3 border border-slate-600 rounded bg-slate-800"
                        style={{
                          backgroundImage: `url(/assets/map_tileset/${activeTileset.name.includes('cute') ? 'cute_tileset.png' : activeTileset.image_source})`,
                          backgroundPosition: `-${((selectedTileData.id - 1) % activeTileset.columns) * activeTileset.tilewidth}px -${Math.floor((selectedTileData.id - 1) / activeTileset.columns) * activeTileset.tileheight}px`,
                          backgroundSize: `${activeTileset.columns * activeTileset.tilewidth}px ${Math.ceil(activeTileset.total_tiles / activeTileset.columns) * activeTileset.tileheight}px`,
                          width: `${activeTileset.tilewidth}px`,
                          height: `${activeTileset.tileheight}px`,
                          transform: 'scale(1.5)',
                          transformOrigin: 'center'
                        }}
                      />
                      <h3 className="font-bold text-white text-lg mb-1 text-center">{selectedTileData.name}</h3>
                      <p className="text-xs text-slate-400 font-mono text-center">ID: {selectedTileData.id}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                        <span className="text-slate-400">Category:</span>
                        <span className="text-white capitalize">{selectedTileData.category.replace('_', ' ')}</span>
                      </div>

                      <div className="flex justify-between border-b border-slate-700 pb-1">
                        <span className="text-slate-400">Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTileData.tags.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-200">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-700">
                        <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Source Image</h4>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400">File:</span>
                          <span className="text-emerald-400 font-mono text-xs">{activeTileset.image_source}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                            <span className="text-slate-500 text-[10px]">X</span>
                            <span className="font-mono text-white">{((selectedTileData.id - 1) % activeTileset.columns) * activeTileset.tilewidth}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                            <span className="text-slate-500 text-[10px]">Y</span>
                            <span className="font-mono text-white">{Math.floor((selectedTileData.id - 1) / activeTileset.columns) * activeTileset.tileheight}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                            <span className="text-slate-500 text-[10px]">W</span>
                            <span className="font-mono text-white">{activeTileset.tilewidth}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                            <span className="text-slate-500 text-[10px]">H</span>
                            <span className="font-mono text-white">{activeTileset.tileheight}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 italic">
                    Select a tile to view details
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
