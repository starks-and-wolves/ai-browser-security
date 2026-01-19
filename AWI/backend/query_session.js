const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-awi')
  .then(async () => {
    const AgentSession = require('./src/models/AgentSession');
    const AgentApiKey = require('./src/models/AgentApiKey');

    // Find the browser-use agent
    const agent = await AgentApiKey.findOne({ name: 'BrowserUseAgent' }).sort({ createdAt: -1 });

    if (!agent) {
      console.log('No BrowserUseAgent found');
      process.exit(0);
    }

    console.log('\n========================================');
    console.log('BROWSER-USE AGENT INFORMATION');
    console.log('========================================');
    console.log('Agent ID:', agent._id);
    console.log('Agent Name:', agent.name);
    console.log('API Key:', agent.key.substring(0, 40) + '...');
    console.log('Permissions:', agent.permissions);
    console.log('Created:', agent.createdAt);
    console.log('Active:', agent.active);

    // Find all sessions for this agent
    const sessions = await AgentSession.find({ agentId: agent._id }).sort({ sessionStartedAt: -1 });

    console.log('\n========================================');
    console.log('AGENT SESSIONS');
    console.log('========================================');
    console.log('Total Sessions:', sessions.length);

    if (sessions.length > 0) {
      const latestSession = sessions[0];

      console.log('\n--- LATEST SESSION ---');
      console.log('Session ID:', latestSession.sessionId);
      console.log('Session Active:', latestSession.sessionActive);
      console.log('Started At:', latestSession.sessionStartedAt);
      console.log('Last Activity:', latestSession.lastActivityAt);
      console.log('Expires At:', latestSession.expiresAt);

      console.log('\n--- SESSION STATISTICS ---');
      console.log('Total Actions:', latestSession.statistics.totalActions);
      console.log('Successful Actions:', latestSession.statistics.successfulActions);
      console.log('Failed Actions:', latestSession.statistics.failedActions);

      console.log('\n--- CURRENT STATE ---');
      console.log('Current Route:', latestSession.currentState.currentRoute);
      console.log('Current Page:', latestSession.currentState.currentPage);
      console.log('Pagination:', JSON.stringify(latestSession.currentState.pagination, null, 2));
      console.log('Active Filters:', JSON.stringify(latestSession.currentState.activeFilters, null, 2));

      console.log('\n========================================');
      console.log('ACTION HISTORY (Trajectory)');
      console.log('========================================');
      console.log('Total Actions in History:', latestSession.actionHistory.length);
      console.log('\n');

      latestSession.actionHistory.forEach((action, index) => {
        console.log(`\n[${index + 1}] ${action.action}`);
        console.log('   Method:', action.method);
        console.log('   Endpoint:', action.endpoint);
        console.log('   Timestamp:', action.timestamp);
        console.log('   Success:', action.success);
        console.log('   Status Code:', action.statusCode);
        if (action.parameters) {
          console.log('   Parameters:', JSON.stringify(action.parameters, null, 6));
        }
        if (action.observationSummary) {
          console.log('   Observation:', action.observationSummary);
        }
        if (action.errorMessage) {
          console.log('   Error:', action.errorMessage);
        }
      });

      if (latestSession.availableActions && latestSession.availableActions.length > 0) {
        console.log('\n========================================');
        console.log('AVAILABLE ACTIONS (Based on Current State)');
        console.log('========================================');
        latestSession.availableActions.forEach((action, index) => {
          console.log(`\n[${index + 1}] ${action.action}`);
          console.log('   Method:', action.method);
          console.log('   Endpoint:', action.endpoint);
          console.log('   Enabled:', action.enabled);
          if (action.requiresPermission) {
            console.log('   Requires Permission:', action.requiresPermission);
          }
          if (action.disabledReason) {
            console.log('   Disabled Reason:', action.disabledReason);
          }
        });
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
