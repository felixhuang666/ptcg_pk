import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { Map, Edit3, Settings, ArrowLeft, MessageSquare, RefreshCw, PanelLeft, PanelRight, Save, Grid, Hand, Pencil, Undo2, Redo2, FilePlus, Sparkles, Maximize, Minimize, Info, Eye, EyeOff, HardDrive } from 'lucide-react';

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

function PhaserGame({ mode, currentMapId, mapName, onMapSaved, roleWalkSprite, roleAtkSprite, playerName, onChatReceived, onSocketReady, showInfoOverlay }: { key?: React.Key, mode: 'play' | 'edit', currentMapId: string, mapName: string, onMapSaved?: () => void, roleWalkSprite: string, roleAtkSprite: string, playerName: string, onChatReceived: (msg: ChatMessage) => void, onSocketReady: (socket: Socket) => void, showInfoOverlay?: boolean }) {
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
      private currentTileType: number = 1;
      public currentEditLayer: 'base' | 'decorations' | 'obstacles' | 'objectCollides' | 'objectEvent' | 'topLayer' = 'base';
      public isEraser: boolean = false;
      public layerVisibility: Record<string, boolean> = {
        base: true, decorations: true, obstacles: true, objectCollides: true, objectEvent: true, topLayer: true
      };
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
      private undoStack: { layers?: Record<string, number[]>, tiles?: number[], objects?: number[] }[] = [];
      private redoStack: { layers?: Record<string, number[]>, tiles?: number[], objects?: number[] }[] = [];
      private isPanning: boolean = false;
      public editorMode: 'draw' | 'move' = 'draw';
      private panStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private camStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private initialZoomDistance: number = 0;
      private initialZoom: number = 1;
      private tilemap: Phaser.Tilemaps.Tilemap | null = null;
      private tileset: Phaser.Tilemaps.Tileset | null = null;
      private baseLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private decorationsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private obstaclesLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private objectCollidesLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private objectEventLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private topLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      private infoText: Phaser.GameObjects.Text | null = null;
      private chatBubbles: Record<string, Phaser.GameObjects.Container> = {};
      private chatTimers: Record<string, Phaser.Time.TimerEvent> = {};
      public currentMapId: string = 'main_200';

      constructor() {
        super('MainScene');
      }

      private upgradeMapData(data: any) {
        if (!data.layers) {
          data.layers = {
            base: data.tiles || Array(data.width * data.height).fill(0),
            decorations: Array(data.width * data.height).fill(0),
            obstacles: Array(data.width * data.height).fill(0),
            objectCollides: data.objects ? data.objects.map((v: number) => Math.max(0, v)) : Array(data.width * data.height).fill(0),
            objectEvent: Array(data.width * data.height).fill(0),
            topLayer: Array(data.width * data.height).fill(0),
          };
        }
      }

      init(data: any) {
        this.isEditor = data.mode === 'edit';
        this.currentMapId = data.currentMapId || 'main_200';
        mainSceneRef.current = this;
        (window as any).__PHASER_MAIN_SCENE__ = this;
      }

      private copyLayers(layers: Record<string, number[]>) {
        const copy: Record<string, number[]> = {};
        for (const k in layers) copy[k] = [...layers[k]];
        return copy;
      }

      public performUndo() {
        if (this.undoStack.length > 0) {
          const prevState = this.undoStack.pop()!;
          this.redoStack.push({ layers: this.copyLayers(this.mapData.layers) });
          this.mapData.layers = this.copyLayers(prevState.layers!);
          this.renderMap();
        }
      }

      public performRedo() {
        if (this.redoStack.length > 0) {
          const nextState = this.redoStack.pop()!;
          this.undoStack.push({ layers: this.copyLayers(this.mapData.layers) });
          this.mapData.layers = this.copyLayers(nextState.layers!);
          this.renderMap();
        }
      }

      public toggleGrid(show: boolean, blockW: number, blockH: number) {
        if (!this.sys || !this.sys.game || !this.add) return;

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
        const layerNames = ['base', 'decorations', 'obstacles', 'objectCollides', 'objectEvent', 'topLayer'];
        const newLayers: Record<string, number[]> = {};

        for (const name of layerNames) {
          newLayers[name] = Array(newW * newH).fill(0);
          for (let y = 0; y < Math.min(oldH, newH); y++) {
            for (let x = 0; x < Math.min(oldW, newW); x++) {
              newLayers[name][y * newW + x] = this.mapData.layers[name][y * oldW + x];
            }
          }
        }

        this.mapData.width = newW;
        this.mapData.height = newH;
        this.mapData.layers = newLayers;

        this.undoStack = [];
        this.redoStack = [];
        this.renderMap();
      }

      public async loadNewMap(id: string) {
        try {
          this.currentMapId = id;
          const res = await fetch(`/api/map?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            this.mapData = data.map_data ? data.map_data : data;
            this.upgradeMapData(this.mapData);
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
          const res = await fetch(`/api/map?id=${this.currentMapId}`);
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data ? data.map_data : data;
          this.upgradeMapData(this.mapData);
          window.dispatchEvent(new CustomEvent('mapLoaded', {
            detail: {
              width: this.mapData.width,
              height: this.mapData.height,
              block_width: this.mapData.block_width || 32,
              block_height: this.mapData.block_height || 32
            }
          }));
        } catch (err) {
          console.error('Failed to load map', err);
          this.mapData = { width: 40, height: 40, tiles: Array(40 * 40).fill(0) };
          this.upgradeMapData(this.mapData);
          window.dispatchEvent(new CustomEvent('mapLoaded', {
            detail: {
              width: this.mapData.width,
              height: this.mapData.height,
              block_width: this.mapData.block_width || 32,
              block_height: this.mapData.block_height || 32
            }
          }));
        }

        if (isDestroyed || !this.sys || !this.sys.game) return;

        this.input.mouse!.disableContextMenu();




        if (this.isEditor) {
          this.renderMap();
          this.setupEditorUI();

          const performZoom = (newZoom: number, pointerX: number, pointerY: number) => {
            if (this.cameras.main.zoom === newZoom) return;
            const worldPoint = this.cameras.main.getWorldPoint(pointerX, pointerY);

            this.cameras.main.setZoom(newZoom);

            const newWorldPoint = this.cameras.main.getWorldPoint(pointerX, pointerY);
            this.cameras.main.scrollX -= newWorldPoint.x - worldPoint.x;
            this.cameras.main.scrollY -= newWorldPoint.y - worldPoint.y;
          };

          this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
            if (pointer.y >= this.scale.height - 80) return; // Editor UI bounds check
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
              return;
            }

            if (this.editorMode === 'move' || pointer.middleButtonDown() || pointer.rightButtonDown()) {
              this.isPanning = true;
              this.panStart.set(pointer.x, pointer.y);
              this.camStart.set(this.cameras.main.scrollX, this.cameras.main.scrollY);
              return;
            }

            this.undoStack.push({ layers: this.copyLayers(this.mapData.layers) });
            this.redoStack = [];

            this.handlePointerDown(pointer);
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
              return;
            }

            if (this.isPanning && (this.editorMode === 'move' || pointer.middleButtonDown() || pointer.rightButtonDown())) {
              const dx = pointer.x - this.panStart.x;
              const dy = pointer.y - this.panStart.y;
              this.cameras.main.scrollX = this.camStart.x - dx / this.cameras.main.zoom;
              this.cameras.main.scrollY = this.camStart.y - dy / this.cameras.main.zoom;
              return;
            }

            if (this.editorMode === 'draw' && pointer.isDown && !pointer.middleButtonDown() && !pointer.rightButtonDown() && !this.input.pointer2.isDown) {
              this.handlePointerDown(pointer);
            }
          });

          this.input.on('pointerup', () => {
            this.isPanning = false;
            if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) {
              this.initialZoomDistance = 0;
            }
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

        socket.on('map_updated_v2', (payload: any) => {
          if (isDestroyed || !this.sys || !this.sys.game) return;
          if (payload.map_id && payload.map_id === this.currentMapId) {
            this.mapData = payload.map_data;
            this.upgradeMapData(this.mapData);
            this.renderMap();
          }
        });

        // fallback for legacy
        socket.on('map_updated', (payload: any) => {
          if (isDestroyed || !this.sys || !this.sys.game) return;
          if (!payload.map_id && this.currentMapId === 'main_200') {
            this.mapData = payload;
            this.upgradeMapData(this.mapData);
            this.renderMap();
          }
        });

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
          if (isDestroyed) return;
          const { width, height } = gameSize;

          if (this.infoText) {
            this.infoText.setPosition(width - 10, 10);
          }



          if (!this.isEditor && this.player) {
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

      public setLayerVisibility(layer: string, isVisible: boolean) {
        this.layerVisibility[layer] = isVisible;
        const layerObj = (this as any)[`${layer}Layer`];
        if (layerObj) {
          layerObj.setVisible(isVisible);
        }
      }

      renderMap() {
        if (!this.mapData || !this.mapData.layers) return;

        if (this.baseLayer) this.baseLayer.destroy();
        if (this.decorationsLayer) this.decorationsLayer.destroy();
        if (this.obstaclesLayer) this.obstaclesLayer.destroy();
        if (this.objectCollidesLayer) this.objectCollidesLayer.destroy();
        if (this.objectEventLayer) this.objectEventLayer.destroy();
        if (this.topLayer) this.topLayer.destroy();
        if (this.tilemap) this.tilemap.destroy();

        // Create an empty tilemap with the right dimensions
        this.tilemap = this.make.tilemap({ width: this.mapData.width, height: this.mapData.height, tileWidth: 32, tileHeight: 32 });

        const setupLayers = (tilesetArray: Phaser.Tilemaps.Tileset[]) => {
          if (!this.tilemap) return;

          const createLayer = (name: string, depth: number, collides: boolean) => {
            const l = this.tilemap!.createBlankLayer(name, tilesetArray, 0, 0)!;
            l.setDepth(depth);
            const data = this.mapData.layers[name];
            if (data) {
              for (let y = 0; y < this.mapData.height; y++) {
                for (let x = 0; x < this.mapData.width; x++) {
                  const val = data[y * this.mapData.width + x];
                  if (val !== undefined && val !== 0 && val !== -1) {
                    l.putTileAt(val, x, y);
                  }
                }
              }
            }
            if (collides) {
              l.setCollisionByExclusion([-1, 0]);
              if (this.player) {
                this.physics.add.collider(this.player, l);
              }
            }
            return l;
          };

          this.baseLayer = createLayer('base', 0, false);
          this.decorationsLayer = createLayer('decorations', 1, false);
          this.obstaclesLayer = createLayer('obstacles', 2, true);
          this.objectCollidesLayer = createLayer('objectCollides', 3, true);
          this.objectEventLayer = createLayer('objectEvent', 4, false);
          this.topLayer = createLayer('topLayer', 10, false);

          // Apply current visibility settings
          Object.entries(this.layerVisibility).forEach(([layer, isVisible]) => {
            const layerObj = (this as any)[`${layer}Layer`];
            if (layerObj) layerObj.setVisible(isVisible);
          });
        };

        const tilesetsMeta = this.mapData.map_meta?.tilesets || [
          {
            firstgid: 1,
            name: 'main_20x10',
            image_source: 'main_20x10.png',
            tilewidth: 32,
            tileheight: 32
          }
        ];

        let loadedCount = 0;
        const totalToLoad = tilesetsMeta.length;
        const tilesetInstances: Phaser.Tilemaps.Tileset[] = [];

        const checkAllLoaded = () => {
          loadedCount++;
          if (loadedCount >= totalToLoad) {
            setupLayers(tilesetInstances);
          }
        };

        if (totalToLoad === 0) {
           setupLayers([]);
        }

        tilesetsMeta.forEach((tsMeta: any) => {
          let src = tsMeta.image_source;
          if (!src.endsWith('.png')) {
            src += '.png';
          }
          const imgUrl = `/assets/map_tileset/${src}`;
          const key = `tileset_${tsMeta.name}`;

          if (!this.textures.exists(key)) {
            this.load.image(key, imgUrl);
            this.load.once(`filecomplete-image-${key}`, () => {
              const ts = this.tilemap!.addTilesetImage(tsMeta.name, key, tsMeta.tilewidth || 32, tsMeta.tileheight || 32, 0, 0, tsMeta.firstgid);
              if (ts) tilesetInstances.push(ts);
              checkAllLoaded();
            });
            this.load.start();
          } else {
            const ts = this.tilemap!.addTilesetImage(tsMeta.name, key, tsMeta.tilewidth || 32, tsMeta.tileheight || 32, 0, 0, tsMeta.firstgid);
            if (ts) tilesetInstances.push(ts);
            checkAllLoaded();
          }
        });

        this.physics.world.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);
        this.cameras.main.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);

        if (!this.isEditor && this.player) {
          this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        }
      }

      setupEditorUI() {
        // No longer using hardcoded keyboard shortcuts for tiles
      }

      updateSelectorText() {
        // Replaced by sidebars
      }

      handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) return; // Ignore draw if multi-touch

        if (!this.mapData || !this.mapData.layers) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileSize = 32;
        const x = Math.floor(worldPoint.x / tileSize);
        const y = Math.floor(worldPoint.y / tileSize);

        if (x >= 0 && x < this.mapData.width && y >= 0 && y < this.mapData.height) {
          const index = y * this.mapData.width + x;
          let targetVal = this.isEraser ? 0 : this.currentTileType;

          let sourceX = 0;
          let sourceY = 0;
          const activeTileset = (window as any).__ACTIVE_TILESET__;
          if (activeTileset && !this.isEraser) {
            const tileIdZeroBased = targetVal - 1;
            if (tileIdZeroBased >= 0) {
              sourceX = (tileIdZeroBased % activeTileset.columns) * activeTileset.tilewidth;
              sourceY = Math.floor(tileIdZeroBased / activeTileset.columns) * activeTileset.tileheight;
            }
          }

          console.log(`Map Editor Draw Debug - ID: ${targetVal}, Pos X: ${x}, Pos Y: ${y}, Index: ${index}, Layer: ${this.currentEditLayer}, Source Image X: ${sourceX}, Source Image Y: ${sourceY}`);

          if (this.currentEditLayer === 'base' || this.currentEditLayer === 'decorations' || this.currentEditLayer === 'topLayer') {
            // 0-based in array, displayed as targetVal
          }

          if (this.mapData.layers[this.currentEditLayer][index] !== targetVal) {
            this.mapData.layers[this.currentEditLayer][index] = targetVal;
            const lMap: Record<string, Phaser.Tilemaps.TilemapLayer | null> = {
              'base': this.baseLayer,
              'decorations': this.decorationsLayer,
              'obstacles': this.obstaclesLayer,
              'objectCollides': this.objectCollidesLayer,
              'objectEvent': this.objectEventLayer,
              'topLayer': this.topLayer
            };
            const l = lMap[this.currentEditLayer];
            if (l) {
              let tileIdx = Math.max(0, targetVal - 1);

              if (targetVal === 0 || targetVal === -1) l.removeTileAt(x, y);
              else l.putTileAt(targetVal, x, y);

              console.log(">> ", this.currentEditLayer, "tileIdx", tileIdx, "targetVal", targetVal, "currentTileType", this.currentTileType)
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

            // Get tile value
            const x = Math.floor(worldPoint.x / tileSize);
            const y = Math.floor(worldPoint.y / tileSize);

            const lMap: Record<string, Phaser.Tilemaps.TilemapLayer | null> = {
              'base': this.baseLayer,
              'decorations': this.decorationsLayer,
              'obstacles': this.obstaclesLayer,
              'objectCollides': this.objectCollidesLayer,
              'objectEvent': this.objectEventLayer,
              'topLayer': this.topLayer
            };
            const l = lMap[this.currentEditLayer];
            let targetVal = 0;
            if (l) {
              const tile = l.getTileAt(x, y);
              if (tile) targetVal = tile.index;
            }

            // Placeholder for future ID and Debug metadata based on grid position
            const idText = `ID: ${targetVal}`;
            const debugText = "Debug: ";

            infoTextRef.current.innerText = `Map: ${mapName}\n${pointerPos}\n${idText}\n${debugText}`;
          } else if (this.player && infoTextRef.current) {
            infoTextRef.current.innerText = `Map: ${mapName}\nPos: (${Math.floor(this.player.x / 32)}, ${Math.floor(this.player.y / 32)})`;
          }
        }

        if (this.isEditor) {
          const camSpeed = 10;
          if (this.cursors?.left.isDown) this.cameras.main.scrollX -= camSpeed;
          else if (this.cursors?.right.isDown) this.cameras.main.scrollX += camSpeed;

          if (this.cursors?.up.isDown) this.cameras.main.scrollY -= camSpeed;
          else if (this.cursors?.down.isDown) this.cameras.main.scrollY += camSpeed;
          return;
        }

        if (!this.player || !this.cursors) return;

        if (this.topLayer && this.mapData) {
          const tileSize = 32;
          const x = Math.floor(this.player.x / tileSize);
          const y = Math.floor(this.player.y / tileSize);

          if (x >= 0 && x < this.mapData.width && y >= 0 && y < this.mapData.height) {
            const tile = this.topLayer.getTileAt(x, y);
            if (tile && tile.index > 0) {
              this.topLayer.setAlpha(0.5);
            } else {
              this.topLayer.setAlpha(1.0);
            }
          }
        }

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
    phaserGameRef.current.scene.start('MainScene', { mode, currentMapId });

    return () => {
      isDestroyed = true;
      socket.disconnect();
      if ((window as any).__PHASER_MAIN_SCENE__ === mainSceneRef.current) {
        (window as any).__PHASER_MAIN_SCENE__ = null;
      }
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
      }
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full">
      <div ref={gameRef} className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl" />
      <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-[1000]">
        <div ref={infoTextRef} className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded whitespace-pre text-left font-mono" style={{ display: showInfoOverlay !== false ? 'block' : 'none' }}></div>
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
  const [currentMapId, setCurrentMapId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const mapIdParam = searchParams.get('mapId');
      if (mapIdParam) return mapIdParam;
    }
    return 'main_200';
  });
  const [currentMapName, setCurrentMapName] = useState<string>('World Map');
  const [selectedTile, setSelectedTile] = useState<number>(0);
  type MapLayer = 'base' | 'decorations' | 'obstacles' | 'objectCollides' | 'objectEvent' | 'topLayer';
  const [editLayer, setEditLayer] = useState<MapLayer>('base');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [resizeWidth, setResizeWidth] = useState<number>(40);
  const [resizeHeight, setResizeHeight] = useState<number>(40);
  const [showLeftSidebar, setShowLeftSidebar] = useState(window.innerWidth > 768);
  const [showRightSidebar, setShowRightSidebar] = useState(window.innerWidth > 768);
  const [rightSidebarTab, setRightSidebarTab] = useState<'tileDetails' | 'advancedSettings'>('tileDetails');
  const [blockWidth, setBlockWidth] = useState<number>(32);
  const [blockHeight, setBlockHeight] = useState<number>(32);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<'draw' | 'move'>('draw');
  const [layerVisibility, setLayerVisibility] = useState<Record<MapLayer, boolean>>({
    base: true,
    decorations: true,
    obstacles: true,
    objectCollides: true,
    objectEvent: true,
    topLayer: true
  });

  const [tilesets, setTilesets] = useState<any[]>([]);
  const [activeTilesetIndex, setActiveTilesetIndex] = useState<number>(0);
  const [selectedTileData, setSelectedTileData] = useState<any>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState<boolean>(true);

  useEffect(() => {
    // Notify Phaser scene when grid settings change
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.toggleGrid) {
      scene.toggleGrid(showGrid, blockWidth, blockHeight);
    }
  }, [showGrid, blockWidth, blockHeight]);

  const loadTilesets = () => {
    fetch('/api/map/tilesets?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTilesets(data);
        }
      })
      .catch(err => console.error('Failed to fetch tilesets', err));
  };

  useEffect(() => {
    loadTilesets();
  }, []);

  const handleImportTilesetToMap = async () => {
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (!scene || !scene.mapData) return;

    const mapData = scene.mapData;
    if (!mapData.map_meta) {
      mapData.map_meta = { tilesets: [] };
    }

    // Fallback if we have old maps
    if (!mapData.map_meta.tilesets) {
      mapData.map_meta.tilesets = [];
    }

    const availableSelect = document.getElementById('available-tilesets-select') as HTMLSelectElement;
    if (!availableSelect || !availableSelect.value) return;

    const tsName = availableSelect.value;
    const tsData = tilesets.find(t => t.name === tsName);
    if (!tsData) return;

    // Check if already exists in map
    if (mapData.map_meta.tilesets.find((t: any) => t.name === tsName)) {
      alert("Tileset already added to this map.");
      return;
    }

    let nextGid = 1;
    const currentTilesets = mapData.map_meta.tilesets;
    if (currentTilesets.length > 0) {
      const last = currentTilesets[currentTilesets.length - 1];
      nextGid = last.firstgid + (last.total_tiles || (last.columns * (last.rows || Math.ceil(last.total_tiles / last.columns))));
    }

    const newTsMeta = {
      firstgid: nextGid,
      name: tsData.name,
      image_source: tsData.image_source || `${tsData.name}.png`,
      columns: tsData.columns,
      tilewidth: tsData.tilewidth || 32,
      tileheight: tsData.tileheight || 32,
      total_tiles: tsData.total_tiles
    };

    mapData.map_meta.tilesets.push(newTsMeta);
    setActiveTilesetIndex(mapData.map_meta.tilesets.length - 1);

    scene.renderMap();
    await handleSaveMap();
  };

  useEffect(() => {
    const handleTileChange = (e: any) => setSelectedTile(e.detail);
    const handleMapLoaded = (e: any) => {
      setResizeWidth(e.detail.width);
      setResizeHeight(e.detail.height);
      if (e.detail.block_width) setBlockWidth(e.detail.block_width);
      if (e.detail.block_height) setBlockHeight(e.detail.block_height);
      loadTilesets();
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

  const handleLayerToggle = (layer: MapLayer) => {
    setEditLayer(layer);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene) scene.currentEditLayer = layer;
  };

  const handleVisibilityToggle = (layer: MapLayer, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisibility = { ...layerVisibility, [layer]: !layerVisibility[layer] };
    setLayerVisibility(newVisibility);
    const scene = (window as any).__PHASER_MAIN_SCENE__;
    if (scene && scene.setLayerVisibility) {
      scene.setLayerVisibility(layer, newVisibility[layer]);
    }
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
    role_walk_sprite: 'yo.png',
    role_atk_sprite: 'yo_atk.png'
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
            onClick={() => {
              if (typeof window !== 'undefined') {
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.set('view', 'RPG_SCENE_EDITOR');
                window.location.search = searchParams.toString();
              }
            }}
            className="p-2 bg-slate-700 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center group relative border border-purple-500/30"
            title="場景編輯器"
          >
            <span className="font-bold text-xs whitespace-nowrap">Scene</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">場景編輯器</span>
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

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative w-full bg-slate-900 min-h-0">


        <div className="flex-1 w-full flex flex-row gap-2 md:gap-4 min-h-0 relative">

          {showLeftSidebar && (
            <div className="absolute md:relative z-[6000] left-0 md:left-auto h-full w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col shrink-0">
              <div className="bg-slate-900 border-b border-slate-700 p-2 text-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Available Tilesets</span>
                  <button onClick={loadTilesets} className="p-1 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700" title="Reload Available Tilesets">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <select id="available-tilesets-select" className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs">
                    {tilesets.map(ts => (
                      <option key={ts.name} value={ts.name}>{ts.name}</option>
                    ))}
                  </select>
                  <button onClick={handleImportTilesetToMap} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold whitespace-nowrap">
                    Add to Map
                  </button>
                </div>
              </div>

              {/* Map Tileset Tabs */}
              {(() => {
                const scene = (window as any).__PHASER_MAIN_SCENE__;
                const mapTilesets = scene?.mapData?.map_meta?.tilesets || [];
                return mapTilesets.length > 0 && (
                  <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-800 p-1 gap-1 shrink-0">
                    {mapTilesets.map((ts: any, idx: number) => (
                      <button
                        key={ts.name}
                        onClick={() => setActiveTilesetIndex(idx)}
                        className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap shrink-0 ${activeTilesetIndex === idx ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        {ts.name}
                      </button>
                    ))}
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {(editLayer === 'base' || editLayer === 'decorations' || editLayer === 'topLayer') && (() => {
                  const scene = (window as any).__PHASER_MAIN_SCENE__;
                  const mapTilesets = scene?.mapData?.map_meta?.tilesets || [];
                  const activeTs = mapTilesets[activeTilesetIndex];

                  if (!activeTs) return <div className="text-xs text-slate-500 text-center py-4">No tilesets added to map.</div>;

                  return (
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: activeTs.total_tiles }).map((_, localId) => {
                        const cols = activeTs.columns;
                        const tw = activeTs.tilewidth || 32;
                        const th = activeTs.tileheight || 32;

                        const x = (localId % cols) * tw;
                        const y = Math.floor(localId / cols) * th;

                        const gid = activeTs.firstgid + localId;

                        // We don't have full tileMeta here since it's just map_meta, but we can fake it or find it from global tilesets if we want
                        const globalTs = tilesets.find(t => t.name === activeTs.name);
                        const tileMeta = globalTs?.tiles?.find((t: any) => t.id === localId + 1) || {
                          id: localId + 1,
                          name: `Tile ${localId + 1}`,
                          category: 'unknown',
                          tags: []
                        };

                        return (
                          <button
                            key={gid}
                            onClick={() => {
                              setSelectedTile(gid);
                              setSelectedTileData(tileMeta);
                              if (scene) scene.currentTileType = gid;
                            }}
                            className={`w-10 h-10 border-2 rounded ${selectedTile === gid ? 'border-blue-500 z-10 scale-110 relative' : 'border-transparent hover:border-slate-500'}`}
                            title={`GID: ${gid} (${tileMeta.name})`}
                            style={{
                              backgroundImage: `url(/assets/map_tileset/${activeTs.image_source})`,
                              backgroundPosition: `-${x}px -${y}px`,
                              backgroundSize: `${cols * tw}px ${Math.ceil(activeTs.total_tiles / cols) * th}px`,
                              width: `${tw}px`,
                              height: `${th}px`
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })()}

                {editLayer === 'obstacles' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setSelectedTile(0); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 0; }} className={`p-2 text-left border rounded ${selectedTile === 0 ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>0: Empty</button>
                    <button onClick={() => { setSelectedTile(1); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 1; }} className={`p-2 text-left border rounded ${selectedTile === 1 ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>1: Wall (Collides)</button>
                  </div>
                )}

                {editLayer === 'objectCollides' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setSelectedTile(0); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 0; }} className={`p-2 text-left border rounded ${selectedTile === 0 ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>0: Empty</button>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button key={i} onClick={() => { setSelectedTile(10001 + i); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 10001 + i; }} className={`p-2 text-left border rounded ${selectedTile === 10001 + i ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{10001 + i}: obj_{i + 1}</button>
                    ))}
                  </div>
                )}

                {editLayer === 'objectEvent' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setSelectedTile(0); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 0; }} className={`p-2 text-left border rounded ${selectedTile === 0 ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>0: Empty</button>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button key={i} onClick={() => { setSelectedTile(20001 + i); const scene = (window as any).__PHASER_MAIN_SCENE__; if (scene) scene.currentTileType = 20001 + i; }} className={`p-2 text-left border rounded ${selectedTile === 20001 + i ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{20001 + i}: evt_{i + 1}</button>
                    ))}
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
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`${showGrid ? 'bg-indigo-600' : 'bg-slate-600'} hover:bg-indigo-500 p-1 rounded transition-colors group relative`}
                  title="Toggle Grid"
                >
                  <Grid className="w-4 h-4 text-white" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Toggle Grid</span>
                </button>
                <button
                  onClick={() => setShowInfoOverlay(!showInfoOverlay)}
                  className={`${showInfoOverlay ? 'bg-indigo-600' : 'bg-slate-600'} hover:bg-indigo-500 p-1 rounded transition-colors group relative`}
                  title="Toggle Info Overlay"
                >
                  <Info className="w-4 h-4 text-white" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Toggle Info Overlay</span>
                </button>
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
                  <div className="flex bg-slate-700 rounded overflow-hidden text-[10px]">
                    {(['base', 'decorations', 'obstacles', 'objectCollides', 'objectEvent', 'topLayer'] as MapLayer[]).map((l, index) => (
                      <div key={l} className={`flex items-center transition-colors ${index !== 0 ? 'border-l border-slate-600' : ''} ${editLayer === l ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                        <button onClick={() => handleLayerToggle(l)} className={`px-1.5 py-1 ${editLayer === l ? 'font-bold' : ''}`}>
                          {l === 'decorations' ? 'Decor' : l === 'obstacles' ? 'Obs' : l === 'objectCollides' ? 'ObjCol' : l === 'objectEvent' ? 'ObjEvt' : l === 'topLayer' ? 'Top' : 'Base'}
                        </button>
                        <button
                          onClick={(e) => handleVisibilityToggle(l, e)}
                          className={`pr-1.5 py-1 ${editLayer === l ? 'hover:text-slate-200' : 'hover:text-white'}`}
                          title={`Toggle ${l} visibility`}
                        >
                          {layerVisibility[l] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
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
                  try {
                    const scene = (window as any).__PHASER_MAIN_SCENE__;
                    if (!scene || !scene.mapData) {
                      alert('No map data available to save.');
                      return;
                    }

                    const res = await fetch('/api/save_local', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        scene: null,
                        maps: [{
                          id: currentMapId,
                          name: currentMapName,
                          map_data: scene.mapData
                        }],
                        game_obj_templates: []
                      })
                    });

                    const result = await res.json();
                    if (result.success) {
                      alert(`Successfully saved map to local assets!`);
                    } else {
                      alert(`Failed to save: ${result.error}`);
                    }
                  } catch (e: any) {
                    alert(`Error saving map to local assets: ${e.message}`);
                  }
                }} className="bg-teal-600 hover:bg-teal-500 text-white p-1 rounded transition-colors ml-1 shadow-lg group relative" title="Save Map to Local Asset">
                  <HardDrive className="w-4 h-4" />
                  <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none border border-slate-700">Save Map to Local</span>
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
                        layers: {
                          base: Array(resizeWidth * resizeHeight).fill(0),
                          decorations: Array(resizeWidth * resizeHeight).fill(0),
                          obstacles: Array(resizeWidth * resizeHeight).fill(0),
                          objectCollides: Array(resizeWidth * resizeHeight).fill(0),
                          objectEvent: Array(resizeWidth * resizeHeight).fill(0),
                          topLayer: Array(resizeWidth * resizeHeight).fill(0)
                        }
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
                currentMapId={currentMapId}
                roleWalkSprite={selectedRole.role_walk_sprite}
                roleAtkSprite={selectedRole.role_atk_sprite}
                playerName={playerName}
                onChatReceived={handleChatReceived}
                onSocketReady={setSocketInstance}
                showInfoOverlay={showInfoOverlay}
              />
            </div>
          </div>

          {showRightSidebar && (
            <div className="absolute md:relative z-[6000] right-0 md:right-auto h-full w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col shrink-0">
              <div className="flex bg-slate-900 border-b border-slate-700">
                <button
                  className={`flex-1 p-2 text-sm font-bold text-center transition-colors ${rightSidebarTab === 'tileDetails' ? 'text-white bg-slate-800 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setRightSidebarTab('tileDetails')}
                >
                  Tile Details
                </button>
                <button
                  className={`flex-1 p-2 text-sm font-bold text-center transition-colors ${rightSidebarTab === 'advancedSettings' ? 'text-white bg-slate-800 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setRightSidebarTab('advancedSettings')}
                >
                  Advanced Settings
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-300">
                {rightSidebarTab === 'tileDetails' && (() => {
                  const scene = (window as any).__PHASER_MAIN_SCENE__;
                  const mapTilesets = scene?.mapData?.map_meta?.tilesets || [];
                  const activeTs = mapTilesets[activeTilesetIndex];
                  return (selectedTileData && activeTs ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                        <div
                          className="mb-3 border border-slate-600 rounded bg-slate-800"
                          style={{
                            backgroundImage: `url(/assets/map_tileset/${activeTs.image_source})`,
                            backgroundPosition: `-${((selectedTileData.id - 1) % activeTs.columns) * (activeTs.tilewidth || 32)}px -${Math.floor((selectedTileData.id - 1) / activeTs.columns) * (activeTs.tileheight || 32)}px`,
                            backgroundSize: `${activeTs.columns * (activeTs.tilewidth || 32)}px ${Math.ceil(activeTs.total_tiles / activeTs.columns) * (activeTs.tileheight || 32)}px`,
                            width: `${activeTs.tilewidth || 32}px`,
                            height: `${activeTs.tileheight || 32}px`,
                            transform: 'scale(1.5)',
                            transformOrigin: 'center'
                          }}
                        />
                        <h3 className="font-bold text-white text-lg mb-1 text-center">{selectedTileData.name}</h3>
                        <p className="text-xs text-slate-400 font-mono text-center">Global ID: {selectedTile}</p>
                        <p className="text-xs text-slate-400 font-mono text-center">Local ID: {selectedTileData.id}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-slate-400">Category:</span>
                          <span className="text-white capitalize">{selectedTileData.category ? selectedTileData.category.replace('_', ' ') : 'unknown'}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-slate-400">Tags:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTileData.tags && selectedTileData.tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-700">
                          <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Source Image</h4>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400">File:</span>
                            <span className="text-emerald-400 font-mono text-xs">{activeTs.image_source}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                              <span className="text-slate-500 text-[10px]">X</span>
                              <span className="font-mono text-white">{((selectedTileData.id - 1) % activeTs.columns) * (activeTs.tilewidth || 32)}</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                              <span className="text-slate-500 text-[10px]">Y</span>
                              <span className="font-mono text-white">{Math.floor((selectedTileData.id - 1) / activeTs.columns) * (activeTs.tileheight || 32)}</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                              <span className="text-slate-500 text-[10px]">W</span>
                              <span className="font-mono text-white">{activeTs.tilewidth || 32}</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded flex flex-col items-center">
                              <span className="text-slate-500 text-[10px]">H</span>
                              <span className="font-mono text-white">{activeTs.tileheight || 32}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 italic">
                      Select a tile to view details
                    </div>
                  ));
                })()}

                {rightSidebarTab === 'advancedSettings' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400 font-bold uppercase">Rename Map</label>
                      <button onClick={handleMapRename} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded text-sm transition-colors text-center w-full">
                        Rename Map
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400 font-bold uppercase">Map Resize</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-slate-900 rounded px-2 py-1 text-sm text-white border border-slate-700">
                          <span className="text-slate-400 mr-1">W:</span>
                          <input
                            type="number"
                            value={resizeWidth}
                            onChange={(e) => setResizeWidth(parseInt(e.target.value) || 10)}
                            className="w-full bg-transparent text-white outline-none text-right"
                            min="10"
                          />
                        </div>
                        <div className="flex-1 flex items-center bg-slate-900 rounded px-2 py-1 text-sm text-white border border-slate-700">
                          <span className="text-slate-400 mr-1">H:</span>
                          <input
                            type="number"
                            value={resizeHeight}
                            onChange={(e) => setResizeHeight(parseInt(e.target.value) || 10)}
                            className="w-full bg-transparent text-white outline-none text-right"
                            min="10"
                          />
                        </div>
                      </div>
                      <button onClick={handleResizeMap} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded text-sm transition-colors w-full">
                        Resize & Save
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400 font-bold uppercase">Block Size Information</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-slate-900 rounded px-2 py-1 text-sm text-white border border-slate-700">
                          <span className="text-slate-400 mr-1">W:</span>
                          <input
                            type="number"
                            value={blockWidth}
                            onChange={(e) => setBlockWidth(parseInt(e.target.value) || 32)}
                            className="w-full bg-transparent text-white outline-none text-right"
                            min="8"
                          />
                        </div>
                        <div className="flex-1 flex items-center bg-slate-900 rounded px-2 py-1 text-sm text-white border border-slate-700">
                          <span className="text-slate-400 mr-1">H:</span>
                          <input
                            type="number"
                            value={blockHeight}
                            onChange={(e) => setBlockHeight(parseInt(e.target.value) || 32)}
                            className="w-full bg-transparent text-white outline-none text-right"
                            min="8"
                          />
                        </div>
                      </div>
                    </div>
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
