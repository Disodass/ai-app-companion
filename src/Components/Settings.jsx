import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Checkbox,
  FormGroup,
  CircularProgress,
  useTheme,
} from '@mui/material';
import HamburgerMenu from './HamburgerMenu';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  DataUsage as DataIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { signOut, db, auth } from '../firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import encryptionManager from '../utils/encryption';

const AI_PROVIDERS = [
  { name: 'Groq (Llama/Mixtral)', key: 'groq' },
  { name: 'OpenAI (ChatGPT)', key: 'openai' },
  { name: 'Claude', key: 'claude' },
  { name: 'Gemini', key: 'gemini' },
];

const DEFAULT_GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export default function Settings() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentTheme, changeTheme, themes } = useAppTheme();
  
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [personas, setPersonas] = useState([
    { name: 'Therapist', access: ['journal', 'chat'] },
    { name: 'Life Coach', access: ['goals', 'chat'] },
  ]);
  const [newPersona, setNewPersona] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountDeleteDialogOpen, setAccountDeleteDialogOpen] = useState(false);
  const [personaDeleteDialogOpen, setPersonaDeleteDialogOpen] = useState(false);
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState({ chatlogs: true, profile: true, settings: true });
  const [personaList, setPersonaList] = useState([]);
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState(false);
  const [unencryptedLogs, setUnencryptedLogs] = useState([]);
  const [encrypting, setEncrypting] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      const load = async () => {
        const ref = doc(db, 'usersettings', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          
          if (encryptionManager.isReady() && data.encrypted) {
            try {
              const decrypted = encryptionManager.decrypt(data.encrypted);
              setProvider(decrypted.provider || 'groq');
              setApiKey(decrypted.apiKey || DEFAULT_GROQ_API_KEY);
              setPersonas(decrypted.personas || [
                { name: 'Therapist', access: ['journal', 'chat'] },
                { name: 'Life Coach', access: ['goals', 'chat'] },
              ]);
              setDarkMode(decrypted.darkMode || false);
            } catch (error) {
              console.error('Failed to decrypt settings:', error);
              setProvider('groq');
              setApiKey(DEFAULT_GROQ_API_KEY);
              setPersonas([
                { name: 'Therapist', access: ['journal', 'chat'] },
                { name: 'Life Coach', access: ['goals', 'chat'] },
              ]);
              setDarkMode(false);
            }
          } else {
            setProvider(data.provider || 'groq');
            setApiKey(data.apiKey || DEFAULT_GROQ_API_KEY);
            setPersonas(data.personas || [
              { name: 'Therapist', access: ['journal', 'chat'] },
              { name: 'Life Coach', access: ['goals', 'chat'] },
            ]);
            setDarkMode(data.darkMode || false);
          }
        }
      };
      load();
    } else {
      const raw = localStorage.getItem('settings');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setProvider(data.provider || 'groq');
          setApiKey(data.apiKey || DEFAULT_GROQ_API_KEY);
          setPersonas(data.personas || [
            { name: 'Therapist', access: ['journal', 'chat'] },
            { name: 'Life Coach', access: ['goals', 'chat'] },
          ]);
          setDarkMode(data.darkMode || false);
        } catch {}
      } else {
        setProvider('groq');
        setApiKey(DEFAULT_GROQ_API_KEY);
        setDarkMode(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    async function fetchPersonas() {
      if (!user) return;
      const chatlogsSnap = await getDocs(collection(db, 'chatlogs'));
      const names = [];
      chatlogsSnap.forEach(docSnap => {
        if (docSnap.id.startsWith(user.uid + '-')) {
          const persona = docSnap.id.split('-').slice(1).join('-');
          if (persona && !names.includes(persona)) names.push(persona);
        }
      });
      setPersonaList(names);
    }
    if (user) fetchPersonas();
  }, [user, success]);

  useEffect(() => {
    async function scanUnencrypted() {
      if (!user) return;
      const snap = await getDocs(collection(db, 'chatlogs'));
      const unenc = [];
      snap.forEach(docSnap => {
        if (docSnap.id.startsWith(user.uid + '-') && !docSnap.data().encrypted) {
          unenc.push(docSnap.id);
        }
      });
      setUnencryptedLogs(unenc);
    }
    if (user) scanUnencrypted();
  }, [user, success]);

  const handleEncryptAll = async () => {
    setEncrypting(true);
    setEncryptionStatus('');
    try {
      for (const docId of unencryptedLogs) {
        const ref = doc(db, 'chatlogs', docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const toEncrypt = {
            messages: data.messages || [],
            summary: data.summary || '',
            aiNotes: data.aiNotes || ''
          };
          const encrypted = encryptionManager.encrypt(toEncrypt);
          await updateDoc(ref, { encrypted, messages: null, summary: null, aiNotes: null });
        }
      }
      setEncryptionStatus('All chatlogs encrypted!');
      setUnencryptedLogs([]);
    } catch (error) {
      setEncryptionStatus('Error encrypting chatlogs: ' + error.message);
    } finally {
      setEncrypting(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    const settingsData = {
      provider,
      apiKey,
      personas,
      darkMode,
      updatedAt: new Date(),
    };

    try {
      if (user) {
        const ref = doc(db, 'usersettings', user.uid);
        if (encryptionManager.isReady()) {
          const encrypted = encryptionManager.encrypt(settingsData);
          await setDoc(ref, { encrypted, updatedAt: new Date() });
        } else {
          await setDoc(ref, settingsData);
        }
        setSuccess('Settings saved to cloud!');
      } else {
        localStorage.setItem('settings', JSON.stringify(settingsData));
        setSuccess('Settings saved locally!');
      }
    } catch (error) {
      setError('Failed to save settings: ' + error.message);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteOptions.chatlogs) {
        const snap = await getDocs(collection(db, 'chatlogs'));
        const deletePromises = [];
        snap.forEach(docSnap => {
          if (docSnap.id.startsWith(user.uid + '-')) {
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        });
        await Promise.all(deletePromises);
      }
      
      if (deleteOptions.profile) {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteDoc(doc(db, 'sharedProfiles', user.uid));
      }
      
      if (deleteOptions.settings) {
        await deleteDoc(doc(db, 'usersettings', user.uid));
      }
      
      setSuccess('Selected data deleted successfully!');
      setDeleteDialogOpen(false);
    } catch (error) {
      setError('Failed to delete data: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeletePersona = async () => {
    setDeleteLoading(true);
    try {
      const snap = await getDocs(collection(db, 'chatlogs'));
      const deletePromises = [];
      snap.forEach(docSnap => {
        if (docSnap.id === `${user.uid}-${personaToDelete}`) {
          deletePromises.push(deleteDoc(docSnap.ref));
        }
      });
      await Promise.all(deletePromises);
      setSuccess(`Chatlog for ${personaToDelete} deleted!`);
      setPersonaDeleteDialogOpen(false);
    } catch (error) {
      setError('Failed to delete persona chatlog: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteUser(auth.currentUser);
      setAccountDeleteDialogOpen(false);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setAccountDeleteDialogOpen(false);
        setReauthDialogOpen(true);
        setPendingDeleteAccount(true);
        setDeleteLoading(false);
        return;
      }
      setError('Failed to delete account. You may need to re-login to confirm deletion.');
    }
    setDeleteLoading(false);
  };

  const handleReauth = async () => {
    setReauthError('');
    if (!reauthEmail || !reauthPassword) {
      setReauthError('Please enter your email and password.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, reauthEmail, reauthPassword);
      setReauthDialogOpen(false);
      setReauthEmail('');
      setReauthPassword('');
      setReauthError('');
      if (pendingDeleteAccount) {
        setPendingDeleteAccount(false);
        await handleDeleteAccount();
      }
    } catch (err) {
      setReauthError('Re-authentication failed. Please check your credentials.');
    }
  };

  const handleAddPersona = () => {
    if (!newPersona.trim()) return;
    setPersonas([...personas, { name: newPersona.trim(), access: [] }]);
    setNewPersona('');
  };

  const handleRemovePersona = (idx) => {
    setPersonas(personas.filter((_, i) => i !== idx));
  };

  return (
    <Box sx={{ minHeight: '100vh', background: theme.palette.background.default, py: 4 }}>
      <HamburgerMenu onSignOut={async () => { await signOut(); navigate('/'); }} />
      <Container maxWidth="md">
        <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          Settings
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* AI Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Configuration
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>AI Provider</InputLabel>
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  label="AI Provider"
                >
                  {AI_PROVIDERS.map(p => (
                    <MenuItem key={p.key} value={p.key}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                type="password"
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={currentTheme}
                  onChange={(e) => changeTheme(e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="ocean">Ocean</MenuItem>
                  <MenuItem value="forest">Forest</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                }
                label="Enable Dark Mode (Legacy)"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Personas */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Personas
            </Typography>
            <List>
              {personas.map((p, i) => (
                <ListItem key={i}>
                  <ListItemText primary={p.name} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleRemovePersona(i)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField
                size="small"
                value={newPersona}
                onChange={(e) => setNewPersona(e.target.value)}
                placeholder="Add new persona"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPersona()}
              />
              <Button
                variant="contained"
                onClick={handleAddPersona}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Persona Chatlogs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Manage Chat History
            </Typography>
            {personaList.length > 0 ? (
              <List>
                {personaList.map(p => (
                  <ListItem key={p}>
                    <ListItemText primary={p} />
                    <ListItemSecondaryAction>
                      <Button
                        color="error"
                        onClick={() => {
                          setPersonaToDelete(p);
                          setPersonaDeleteDialogOpen(true);
                        }}
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No persona chatlogs found.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<SaveIcon />}
              >
                Save Settings
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
                startIcon={<DeleteIcon />}
              >
                Delete Data
              </Button>
              {user && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setAccountDeleteDialogOpen(true)}
                  startIcon={<WarningIcon />}
                >
                  Delete Account
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="text"
                onClick={() => navigate('/profile')}
                startIcon={<PersonIcon />}
              >
                View Profile
              </Button>
              <Button
                variant="text"
                onClick={() => navigate('/privacy')}
                startIcon={<SecurityIcon />}
              >
                Privacy Policy
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Data</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the selected data? This cannot be undone.
            </DialogContentText>
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteOptions.chatlogs}
                    onChange={(e) => setDeleteOptions(o => ({ ...o, chatlogs: e.target.checked }))}
                  />
                }
                label="Delete all chatlogs"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteOptions.profile}
                    onChange={(e) => setDeleteOptions(o => ({ ...o, profile: e.target.checked }))}
                  />
                }
                label="Delete profile"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteOptions.settings}
                    onChange={(e) => setDeleteOptions(o => ({ ...o, settings: e.target.checked }))}
                  />
                }
                label="Delete settings"
              />
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={accountDeleteDialogOpen} onClose={() => setAccountDeleteDialogOpen(false)}>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete your account and all data? This cannot be undone.
            </DialogContentText>
            <Alert severity="error" sx={{ mt: 2 }}>
              This will delete your authentication account, all chatlogs, profile, and settings.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAccountDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteAccount} color="error" disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={20} /> : 'Delete Account'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={personaDeleteDialogOpen} onClose={() => setPersonaDeleteDialogOpen(false)}>
          <DialogTitle>Delete Persona Chatlog</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the chat history for persona <strong>{personaToDelete}</strong>? This cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPersonaDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeletePersona} color="error" disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={20} /> : 'Delete Chatlog'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={reauthDialogOpen} onClose={() => setReauthDialogOpen(false)}>
          <DialogTitle>Re-authenticate to Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              For security, please re-enter your email and password to delete your account.
            </DialogContentText>
            <TextField
              fullWidth
              type="email"
              label="Email"
              value={reauthEmail}
              onChange={(e) => setReauthEmail(e.target.value)}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              sx={{ mt: 2 }}
            />
            {reauthError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {reauthError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReauthDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReauth} disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={20} /> : 'Re-authenticate'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
} 