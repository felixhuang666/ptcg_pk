import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { Map, Edit3, Settings, ArrowLeft, MessageSquare } from 'lucide-react';

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

function PhaserGame({ mode, onMapSaved, roleWalkSprite, roleAtkSprite, playerName, onChatReceived, onSocketReady }: { key?: React.Key, mode: 'play' | 'edit', onMapSaved?: () => void, roleWalkSprite: string, roleAtkSprite: string, playerName: string, onChatReceived: (msg: ChatMessage) => void, onSocketReady: (socket: Socket) => void }) {
  const gameRef = useRef<HTMLDivElement>(null);
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
      private currentTileType: number = 1; // 0 = grass, 1 = water, 2 = mountain
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
      private actionMode: 'walk' | 'attack' = 'walk';
      private currentDirection: string = 'down';
      private attackButton: Phaser.GameObjects.Text | null = null;
      private modeButton: Phaser.GameObjects.Text | null = null;
      private attackButtonDown: boolean = false;
      private undoStack: number[][] = [];
      private redoStack: number[][] = [];
      private isPanning: boolean = false;
      private panStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private camStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private tilemap: Phaser.Tilemaps.Tilemap | null = null;
      private tileset: Phaser.Tilemaps.Tileset | null = null;
      private layer: Phaser.Tilemaps.TilemapLayer | null = null;
      private infoText: Phaser.GameObjects.Text | null = null;

      constructor() {
        super('MainScene');
      }

      init(data: any) {
        this.isEditor = data.mode === 'edit';
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
        const graphics = this.make.graphics({ x: 0, y: 0 });

        graphics.fillStyle(0x228b22);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(1, 0x000000, 0.2);
        graphics.strokeRect(0, 0, 32, 32);

        graphics.fillStyle(0x1e90ff);
        graphics.fillRect(32, 0, 32, 32);
        graphics.strokeRect(32, 0, 32, 32);

        graphics.fillStyle(0x808080);
        graphics.fillRect(64, 0, 32, 32);
        graphics.strokeRect(64, 0, 32, 32);

        graphics.generateTexture('tileset', 96, 32);

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
          this.mapData = await res.json();
        } catch (err) {
          console.error('Failed to load map', err);
          this.mapData = { width: 200, height: 200, tiles: Array(200 * 200).fill(0) };
        }

        if (isDestroyed || !this.sys || !this.sys.game) return;

        this.input.mouse!.disableContextMenu();

        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
          if (pointer.y >= 480) return;
          let newZoom = this.cameras.main.zoom - deltaY * 0.001;
          newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
          this.cameras.main.setZoom(newZoom);
        });

        this.infoText = this.add.text(630, 10, '', {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 8, y: 4 },
          align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000);

        if (this.isEditor) {
          this.renderMap();
          this.setupEditorUI();

          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

            if (pointer.y >= 480) return;

            if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
              this.isPanning = true;
              this.panStart.set(pointer.x, pointer.y);
              this.camStart.set(this.cameras.main.scrollX, this.cameras.main.scrollY);
              return;
            }

            this.undoStack.push([...this.mapData.tiles]);
            this.redoStack = [];

            this.handlePointerDown(pointer);
          });

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isPanning && (pointer.middleButtonDown() || pointer.rightButtonDown())) {
              const dx = pointer.x - this.panStart.x;
              const dy = pointer.y - this.panStart.y;
              this.cameras.main.scrollX = this.camStart.x - dx / this.cameras.main.zoom;
              this.cameras.main.scrollY = this.camStart.y - dy / this.cameras.main.zoom;
              return;
            }

            if (pointer.isDown && !pointer.middleButtonDown() && !pointer.rightButtonDown()) {
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

          this.modeButton = this.add.text(500, 20, 'Mode: Walk', {
            color: '#ffffff',
            backgroundColor: '#0000aa',
            padding: { x: 10, y: 5 }
          }).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true });

          this.modeButton.on('pointerdown', () => {
            if (this.actionMode === 'walk') {
              this.actionMode = 'attack';
              this.modeButton!.setText('Mode: Attack');
              this.modeButton!.setBackgroundColor('#aa0000');
              this.attackButton!.setVisible(true);
            } else {
              this.actionMode = 'walk';
              this.modeButton!.setText('Mode: Walk');
              this.modeButton!.setBackgroundColor('#0000aa');
              this.attackButton!.setVisible(false);
            }
          });

          this.attackButton = this.add.text(520, 380, 'ATTACK', {
            color: '#ffffff',
            backgroundColor: '#aa0000',
            padding: { x: 15, y: 15 },
            fontSize: '18px',
            fontStyle: 'bold'
          }).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

          this.attackButton.on('pointerdown', () => { this.attackButtonDown = true; this.triggerAttack(); });
          this.attackButton.on('pointerup', () => { this.attackButtonDown = false; });
          this.attackButton.on('pointerout', () => { this.attackButtonDown = false; });

          this.input.keyboard!.on('keydown-SPACE', () => this.triggerAttack());
        }

        socket.on('map_updated', (newMapData: any) => {
          if (isDestroyed || !this.sys || !this.sys.game) return;
          this.mapData = newMapData;
          this.renderMap();
        });
      }

      triggerAttack() {
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
        if (this.tilemap) {
          this.tilemap.destroy();
        }

        this.tilemap = this.make.tilemap({ data: data2D, tileWidth: 32, tileHeight: 32 });
        this.tileset = this.tilemap.addTilesetImage('tileset')!;
        this.layer = this.tilemap.createLayer(0, this.tileset, 0, 0)!;
        this.layer.setDepth(0);

        this.layer.setCollision([2, 3]);

        if (this.player) {
          this.physics.add.collider(this.player, this.layer);
        }

        this.physics.world.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);
        this.cameras.main.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);

        if (!this.isEditor && this.player) {
          this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        }
      }

      setupEditorUI() {
        this.add.rectangle(320, 520, 640, 80, 0x333333).setScrollFactor(0).setDepth(10);

        this.tileSelector = this.add.text(20, 510, 'Selected: Water (Press 1:Grass, 2:Water, 3:Mountain)', { color: '#ffffff', fontSize: '14px' }).setScrollFactor(0).setDepth(11);

        this.saveButton = this.add.text(500, 505, '[ SAVE MAP ]', {
          color: '#00ff00',
          backgroundColor: '#004400',
          padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        const undoBtn = this.add.text(350, 505, 'UNDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        undoBtn.on('pointerdown', () => {
          if (this.undoStack.length > 0) {
            this.redoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.undoStack.pop();
            this.renderMap();
          }
        });

        const redoBtn = this.add.text(420, 505, 'REDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        redoBtn.on('pointerdown', () => {
          if (this.redoStack.length > 0) {
            this.undoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.redoStack.pop();
            this.renderMap();
          }
        });

        this.saveButton.on('pointerdown', async () => {
          this.saveButton!.setText('SAVING...');
          try {
            await fetch('/api/map', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.mapData)
            });
            this.saveButton!.setText('[ SAVED! ]');
            setTimeout(() => this.saveButton!.setText('[ SAVE MAP ]'), 2000);
            if (onMapSaved) onMapSaved();
          } catch (err) {
            console.error('Save failed', err);
            this.saveButton!.setText('[ ERROR ]');
          }
        });

        this.input.keyboard!.on('keydown-ONE', () => { this.currentTileType = 0; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-TWO', () => { this.currentTileType = 1; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-THREE', () => { this.currentTileType = 2; this.updateSelectorText(); });
      }

      updateSelectorText() {
        const names = ['Grass', 'Water', 'Mountain'];
        this.tileSelector?.setText(`Selected: ${names[this.currentTileType]} (Press 1:Grass, 2:Water, 3:Mountain)`);
      }

      handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (!this.mapData || pointer.y >= 480) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileSize = 32;
        const x = Math.floor(worldPoint.x / tileSize);
        const y = Math.floor(worldPoint.y / tileSize);

        if (x >= 0 && x < this.mapData.width && y >= 0 && y < this.mapData.height) {
          const index = y * this.mapData.width + x;
          if (this.mapData.tiles[index] !== this.currentTileType) {
            this.mapData.tiles[index] = this.currentTileType;
            if (this.layer) {
              this.layer.putTileAt(this.currentTileType + 1, x, y);
            }
          }
        }
      }

      update(time: number, delta: number) {
        if (this.infoText) {
          if (this.isEditor) {
            const cam = this.cameras.main;
            this.infoText.setText(`Map: World\nCam: (${Math.floor(cam.scrollX / 32)}, ${Math.floor(cam.scrollY / 32)})`);
          } else if (this.player) {
            this.infoText.setText(`Map: World\nPos: (${Math.floor(this.player.x / 32)}, ${Math.floor(this.player.y / 32)})`);
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
          if (this.nameTags[socket.id]) {
            this.nameTags[socket.id].setPosition(this.player.x, this.player.y - 40);
          }
        }
      }
    }

    const gameWidth = 640;
    const gameHeight = mode === 'edit' ? 560 : 480;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.FIT,
        parent: gameRef.current,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: gameWidth,
        height: gameHeight
      },
      audio: {
        noAudio: true
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

  return <div ref={gameRef} className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl" />;
}

export default function RpgMode({ onBack }: RpgModeProps) {
  const [mode, setMode] = useState<'play' | 'edit'>('play');
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const { roles, selectedRoleId, user } = useAppStore() as any; // Cast to any to get user if it's there or just use localstorage

  // Try to get user from global if possible, otherwise fallback
  const [playerName, setPlayerName] = useState(user?.name || 'Player');
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

      if (!isFullscreen) {
        setShowFullscreenPrompt(true);
      }
    };
    checkFullscreen();
  }, []);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !socketInstance) return;

    // Send via socket
    socketInstance.emit('chat_message', { message: currentMessage });
    setCurrentMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans w-full absolute inset-0 z-50">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </button>
          <div className="flex items-center gap-2">
            <Map className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight text-white">RPG 模式</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-700 rounded-lg p-1 mr-2">
            <button
              onClick={() => setMode('play')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'play' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
            >
              遊玩模式
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${mode === 'edit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
            >
              <Edit3 className="w-4 h-4" /> 地圖編輯
            </button>
          </div>

          {mode === 'play' && playerName !== 'Player' && (
            <button
              onClick={() => setIsChatMinimized(!isChatMinimized)}
              className={`p-2 transition-colors rounded-full ${!isChatMinimized ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title={isChatMinimized ? "展開聊天" : "收起聊天"}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative w-full bg-slate-900">
        {showFullscreenPrompt && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">進入全螢幕模式</h2>
              {isFullscreenSupported ? (
                <>
                  <p className="text-slate-300 mb-8">為了獲得最佳的遊戲體驗，建議您切換至全螢幕模式遊玩。</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowFullscreenPrompt(false)}
                      className="px-6 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                    >
                      稍後再說
                    </button>
                    <button
                      onClick={requestFullscreen}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-xl hover:from-emerald-500 hover:to-green-400 transition-transform transform hover:scale-105 shadow-lg shadow-emerald-900/50"
                    >
                      啟動全螢幕
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300 mb-8">您的瀏覽器目前不支援自動全螢幕功能。<br/><br/>為了獲得最佳體驗，建議您使用瀏覽器的<br/><strong className="text-emerald-400">「加入主畫面」</strong>功能，將遊戲安裝至桌面後開啟。</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowFullscreenPrompt(false)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-xl hover:from-emerald-500 hover:to-green-400 transition-transform transform hover:scale-105 shadow-lg shadow-emerald-900/50"
                    >
                      我知道了
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl z-[100] max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 text-white">系統設定</h2>
            <p className="text-sm text-slate-400 mb-4">
              RPG 模式的資料會透過 API 進行同步。
            </p>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full bg-slate-700 text-white font-medium py-2 rounded hover:bg-slate-600 transition-colors"
            >
              關閉
            </button>
          </div>
        )}

        <div className="w-[90vw] h-[80vh] max-w-6xl max-h-[800px] flex flex-col md:flex-row gap-4">

          {mode === 'play' && playerName !== 'Player' && !isChatMinimized && (
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden h-64 md:h-full md:w-80 shrink-0 transition-all duration-300">
              <div className="bg-slate-700 p-3 border-b border-slate-600 flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  即時聊天
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-xs text-slate-400 mb-1">{msg.name}</span>
                        <div className="bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm w-fit break-all">
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-700 border-t border-slate-600 flex gap-2">
                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="輸入訊息..."
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-full"
                    />
                    <button
                      type="submit"
                      disabled={!currentMessage.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      發送
                    </button>
                  </form>
            </div>
          )}

          <div className="flex-1 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-0">
            {(playerName !== 'Player' || mode === 'edit') && (
              <PhaserGame
                key={mode}
                mode={mode}
                roleWalkSprite={selectedRole.role_walk_sprite}
                roleAtkSprite={selectedRole.role_atk_sprite}
                playerName={playerName}
                onChatReceived={handleChatReceived}
                onSocketReady={setSocketInstance}
              />
            )}
            {playerName === 'Player' && mode === 'play' && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-white text-xl animate-pulse">載入中...</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-slate-400 text-sm">
          {mode === 'play' ? (
            <p>使用 <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs mx-1">方向鍵</kbd> 移動。點擊 <b>Mode: Walk</b> 切換為攻擊模式，長按 <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs mx-1">空白鍵</kbd> 或 ATTACK 按鈕連續攻擊。</p>
          ) : (
            <p>點擊塗抹地塊。使用 <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs mx-1">1</kbd> <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs mx-1">2</kbd> <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs mx-1">3</kbd> 切換地形。右鍵或方向鍵拖曳視野，滾輪縮放。</p>
          )}
        </div>

      </main>
    </div>
  );
}
